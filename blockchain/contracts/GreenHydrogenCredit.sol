// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GreenHydrogenCredit is
    ERC20,
    ERC20Burnable,
    AccessControl,
    ReentrancyGuard
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // 1 token = 1 USDC (6 decimals)
    uint256 public immutable PRICE_PER_TOKEN = 1e6;

    // Payment token (typically USDC)
    IERC20 public immutable payment_token;

    // Treasury address for collecting payments
    address public treasury;

    event tokens_purchased(
        address indexed buyer,
        uint256 token_amount,
        uint256 cost_in_payment_token
    );
    event tokens_retired(
        address indexed user,
        uint256 token_amount
    );
    event treasury_updated(address new_treasury);

    constructor(
        address admin,
        address initial_treasury,
        address payment_token_address
    ) ERC20("GreenHydrogenCredit", "GHC") {
        require(admin != address(0), "admin zero");
        require(initial_treasury != address(0), "treasury zero");
        require(payment_token_address != address(0), "payment token zero");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        treasury = initial_treasury;
        payment_token = IERC20(payment_token_address);
    }

    // --------------------------
    // modifiers
    // --------------------------
    modifier only_admin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "only admin");
        _;
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    // --------------------------
    // admin setters
    // --------------------------
    function update_treasury(address new_treasury) public only_admin {
        require(new_treasury != address(0), "treasury zero");
        treasury = new_treasury;
        emit treasury_updated(new_treasury);
    }

    // --------------------------
    // minting
    // --------------------------
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "mint to zero");
        _mint(to, amount);
    }

    // --------------------------
    // buy tokens with stablecoin
    // --------------------------
    function buy_tokens(uint256 token_amount)
        public
        nonReentrant
    {
        require(token_amount > 0, "token_amount > 0");

        uint256 cost = (token_amount * PRICE_PER_TOKEN) / 1e18;

        require(
            payment_token.transferFrom(msg.sender, address(this), cost),
            "payment transfer failed"
        );

        _mint(msg.sender, token_amount);
        emit tokens_purchased(msg.sender, token_amount, cost);
    }

    // --------------------------
    // retire tokens (burn)
    // --------------------------
    function retire_tokens(uint256 token_amount) public {
        require(token_amount > 0, "token_amount > 0");
        _burn(msg.sender, token_amount);
        emit tokens_retired(msg.sender, token_amount);
    }

    // --------------------------
    // withdraw payment tokens to treasury
    // --------------------------
    function withdraw_payment_tokens(uint256 amount)
        public
        only_admin
        nonReentrant
    {
        require(amount > 0, "amount > 0");
        require(
            payment_token.balanceOf(address(this)) >= amount,
            "insufficient contract balance"
        );
        require(payment_token.transfer(treasury, amount), "withdraw failed");
    }

    function withdraw_all_payment_tokens() public only_admin nonReentrant {
        uint256 balance = payment_token.balanceOf(address(this));
        require(balance > 0, "zero balance");
        require(payment_token.transfer(treasury, balance), "withdraw failed");
    }

    // --------------------------
    // view helpers
    // --------------------------
    function contract_payment_balance() public view returns (uint256) {
        return payment_token.balanceOf(address(this));
    }

    function get_cost_for_tokens(uint256 token_amount)
        public
        pure
        returns (uint256)
    {
        return (token_amount * PRICE_PER_TOKEN) / 1e18;
    }

    // --------------------------
    // safety overrides
    // --------------------------
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
