// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SustainabilityCredits
 * @dev Implementation of an ERC20 token for campus sustainability rewards.
 * Each credit represents a verified sustainability action or energy savings.
 */
contract SustainabilityCredits is ERC20, Ownable {
    
    // Mapping to track verified energy savings by department
    mapping(string => uint256) public departmentSavings;
    
    // Event to log sustainability actions on-chain
    event ActionVerified(
        address indexed student, 
        string actionType, 
        uint256 amount, 
        string roomId
    );

    constructor() ERC20("Campus Sustainability Credit", "CSC") Ownable(msg.sender) {
        // Initial mint for the system pool
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    /**
     * @dev Awards credits to a student after AI verification.
     * Can only be called by the system backend (Owner).
     */
    function awardCredits(address student, uint256 amount, string memory actionType, string memory roomId) external onlyOwner {
        _mint(student, amount * 10**decimals());
        emit ActionVerified(student, actionType, amount, roomId);
    }
    
    /**
     * @dev Records department energy savings.
     */
    function recordDepartmentSavings(string memory department, uint256 savings) external onlyOwner {
        departmentSavings[department] += savings;
    }
}
