// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GreenHydrogenCredit is ERC20, ERC20Burnable, ReentrancyGuard
{
    IERC20 public immutable paymentToken;

    event tokens_minted(address indexed minter, uint256 amount);
    event tokens_sold(
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 cost
    );

    constructor(address paymentTokenAddress) ERC20("GreenHydrogenCredit", "GHC") {
        require(paymentTokenAddress != address(0), "payment token zero");
        paymentToken = IERC20(paymentTokenAddress);
    }

    // Minting is now open to anyone
    function mintGHC(uint256 amount) public {
        require(amount > 0, "amount > 0");
        _mint(msg.sender, amount);
        emit tokens_minted(msg.sender, amount);
    }

    // Peer-to-peer sale
    function buyFromSeller(address seller, uint256 amount, uint256 pricePerToken) public nonReentrant {
        require(seller != address(0), "seller zero");
        require(amount > 0, "amount > 0");
        require(balanceOf(seller) >= amount, "seller balance low");

        uint256 cost = amount * pricePerToken;

        // Transfer payment token from buyer to seller
        require(paymentToken.transferFrom(msg.sender, seller, cost), "payment failed");

        // Transfer GHC from seller to buyer
        _transfer(seller, msg.sender, amount);

        emit tokens_sold(msg.sender, seller, amount, cost);
    }

    function getGhcCost(uint256 amount, uint256 pricePerToken) public pure returns (uint256) {
        return amount * pricePerToken;
    }

    // Optional override
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
