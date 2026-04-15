// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MockUSDC is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address defaultAdmin) ERC20("Mock USDC", "mUSDC") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    // Decimals for USDC is usually 6, but for simplicity in testing with GHC (18), 
    // I'll keep it 18 unless requested otherwise, or use 6 to be realistic.
    // Let's use 6 to be more realistic for a stablecoin.
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
