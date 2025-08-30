// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GreenHydrogenCredit is
	ERC20,
	ERC20Burnable,
	Pausable,
	AccessControl,
	ReentrancyGuard
{
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

	// 1 token = 1 kg hydrogen (token has 18 decimals by default)
	uint256 public price_per_token; // in wei per token (1 ether = 1e18 wei)
	address public treasury; // where owner withdraws funds

	event tokens_purchased(
		address indexed buyer,
		uint256 token_amount,
		uint256 cost
	);
	event tokens_refunded(
		address indexed user,
		uint256 token_amount,
		uint256 refund
	);
	event price_updated(uint256 new_price);
	event treasury_updated(address new_treasury);

	constructor(
		address admin,
		address initial_treasury,
		uint256 initial_price_per_token
	) ERC20("GreenHydrogenCredit", "GHC") {
		require(admin != address(0), "admin zero");
		require(initial_treasury != address(0), "treasury zero");

		// roles
		_grantRole(DEFAULT_ADMIN_ROLE, admin);
		_grantRole(MINTER_ROLE, admin);

		price_per_token = initial_price_per_token;
		treasury = initial_treasury;

		// optionally mint initial supply to admin (commented)
		// _mint(admin, initial_supply);
	}

	// --------------------------
	// modifiers and helpers
	// --------------------------
	modifier only_admin() {
		require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "only admin");
		_;
	}

	function decimals() public pure override returns (uint8) {
		return 18;
	}

	// --------------------------
	// pause/unpause (admin)
	// --------------------------
	function pause() public only_admin {
		_pause();
	}

	function unpause() public only_admin {
		_unpause();
	}

	// --------------------------
	// admin setters
	// --------------------------
	function update_price(uint256 new_price) public only_admin {
		require(new_price > 0, "price > 0");
		price_per_token = new_price;
		emit price_updated(new_price);
	}

	function update_treasury(address new_treasury) public only_admin {
		require(new_treasury != address(0), "treasury zero");
		treasury = new_treasury;
		emit treasury_updated(new_treasury);
	}

	// allow admin to grant/revoke minter role using AccessControl functions
	// _grantRole(MINTER_ROLE, account) and _revokeRole(MINTER_ROLE, account)

	// --------------------------
	// minting (MINTER_ROLE)
	// --------------------------
	function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
		require(to != address(0), "mint to zero");
		_mint(to, amount);
	}

	// internal helper for AccessControl style
	function only_role(bytes32 role) internal view {
		require(hasRole(role, msg.sender), "missing role");
	}

	// --------------------------
	// buy tokens (payable)
	// --------------------------
	// buyer calls buy_tokens(amount_in_tokens) and sends ETH >= amount * price_per_token
	// amount is token units (with decimals). Typical caller will use ethers.utils.parseUnits("1", 18) for 1 token.
	function buy_tokens(
		uint256 token_amount
	) public payable whenNotPaused nonReentrant {
		require(token_amount > 0, "token_amount > 0");
		uint256 cost = mul_div(
			token_amount,
			price_per_token,
			(10 ** decimals())
		);
		require(msg.value >= cost, "insufficient payment");

		// mint tokens to buyer
		_mint(msg.sender, token_amount);

		// refund excess payment if any
		if (msg.value > cost) {
			uint256 excess = msg.value - cost;
			(bool sent, ) = msg.sender.call{value: excess}("");
			require(sent, "refund failed");
		}

		emit tokens_purchased(msg.sender, token_amount, cost);
	}

	// --------------------------
	// retire tokens (burn)
	// --------------------------
	// user calls retire_tokens(token_amount) to burn tokens (no ETH returned)
	function retire_tokens(uint256 token_amount) public whenNotPaused {
		require(token_amount > 0, "token_amount > 0");
		_burn(msg.sender, token_amount);
		// event from ERC20Burnable not emitted explicitly; you can add custom event if desired
	}

	// --------------------------
	// refund tokens -> receive ETH back (burn tokens and send ETH)
	// --------------------------
	function refund_tokens(
		uint256 token_amount
	) public whenNotPaused nonReentrant {
		require(token_amount > 0, "token_amount > 0");

		uint256 refund = mul_div(
			token_amount,
			price_per_token,
			(10 ** decimals())
		);
		require(address(this).balance >= refund, "contract lacks ETH");

		// burn tokens first
		_burn(msg.sender, token_amount);

		// send ETH refund
		(bool sent, ) = msg.sender.call{value: refund}("");
		require(sent, "refund transfer failed");

		emit tokens_refunded(msg.sender, token_amount, refund);
	}

	// --------------------------
	// withdraw collected ETH to treasury (admin)
	// --------------------------
	function withdraw(uint256 amount) public only_admin nonReentrant {
		require(amount > 0, "amount > 0");
		require(
			address(this).balance >= amount,
			"insufficient contract balance"
		);
		(bool sent, ) = treasury.call{value: amount}("");
		require(sent, "withdraw failed");
	}

	// convenience: withdraw all
	function withdraw_all() public only_admin nonReentrant {
		uint256 bal = address(this).balance;
		require(bal > 0, "zero balance");
		(bool sent, ) = treasury.call{value: bal}("");
		require(sent, "withdraw failed");
	}

	// --------------------------
	// view helpers
	// --------------------------
	function contract_balance() public view returns (uint256) {
		return address(this).balance;
	}

	// --------------------------
	// safety overrides
	// --------------------------

	function _beforeTokenTransfer(
		address from,
		address to,
		uint256 amount
	) internal override(ERC20) whenNotPaused {
		super._beforeTokenTransfer(from, to, amount);
	}

	// --------------------------
	// math helper: multiply then divide safely (avoid overflow)
	// uses unchecked where safe; token_amount and price_per_token are uint256, decimals constant is small
	// --------------------------
	function mul_div(
		uint256 x,
		uint256 y,
		uint256 z
	) internal pure returns (uint256) {
		// compute (x * y) / z with full precision where z != 0
		// here z = 10**decimals, so safe
		unchecked {
			return (x * y) / z;
		}
	}

	// allow contract to receive ETH (so buy_tokens works and refunds can be paid)
	receive() external payable {}

	fallback() external payable {}
}
