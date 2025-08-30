// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HydrogenCredit {
	address public owner;
	mapping(address => uint256) public credits;

	event CreditPurchased(address indexed buyer, uint256 amount);
	event CreditTransferred(
		address indexed from,
		address indexed to,
		uint256 amount
	);

	constructor() {
		owner = msg.sender;
	}

	function buyCredits(uint256 amount) public payable {
		require(msg.value >= amount * 0.01 ether, "Insufficient payment"); // e.g., 0.01 ETH per credit
		credits[msg.sender] += amount;
		emit CreditPurchased(msg.sender, amount);
	}

	function transferCredits(address to, uint256 amount) public {
		require(credits[msg.sender] >= amount, "Not enough credits");
		credits[msg.sender] -= amount;
		credits[to] += amount;
		emit CreditTransferred(msg.sender, to, amount);
	}

	function getMyCredits() public view returns (uint256) {
		return credits[msg.sender];
	}
}
