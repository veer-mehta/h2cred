// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GHC_Marketplace is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        uint256 amount;
        uint256 price; // Price in Stablecoin (e.g., USDC has 6 decimals)
        bool active;
    }

    IERC20 public immutable ghcToken;
    IERC20 public immutable stablecoin;

    mapping(uint256 => Listing) public listings;
    uint256 public nextListingId;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 amount, uint256 price);
    event Purchased(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 price);
    event Cancelled(uint256 indexed listingId);

    constructor(address _ghcToken, address _stablecoin, address _initialOwner) Ownable(_initialOwner) {
        ghcToken = IERC20(_ghcToken);
        stablecoin = IERC20(_stablecoin);
    }

    /// @notice List GHC for sale
    /// @param _amount Amount of GHC to sell
    /// @param _price Total price in stablecoin for the entire amount
    function list(uint256 _amount, uint256 _price) external nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(_price > 0, "Price must be > 0");

        // Transfer GHC to this contract as escrow
        ghcToken.safeTransferFrom(msg.sender, address(this), _amount);

        listings[nextListingId] = Listing({
            seller: msg.sender,
            amount: _amount,
            price: _price,
            active: true
        });

        emit Listed(nextListingId, msg.sender, _amount, _price);
        nextListingId++;
    }

    /// @notice Buy GHC from a listing
    /// @param _listingId The ID of the listing to buy
    function buy(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing is not active");

        listing.active = false;

        // 1. Transfer Stablecoin from Buyer to Seller
        stablecoin.safeTransferFrom(msg.sender, listing.seller, listing.price);

        // 2. Transfer GHC from Escrow to Buyer
        ghcToken.safeTransfer(msg.sender, listing.amount);

        emit Purchased(_listingId, msg.sender, listing.amount, listing.price);
    }

    /// @notice Cancel a listing and retrieve GHC
    /// @param _listingId The ID of the listing to cancel
    function cancel(uint256 _listingId) external nonReentrant {
        Listing storage listing = listings[_listingId];
        require(listing.active, "Listing is not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.active = false;

        // Return GHC to seller
        ghcToken.safeTransfer(msg.sender, listing.amount);

        emit Cancelled(_listingId);
    }
}
