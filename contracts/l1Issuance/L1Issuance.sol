pragma solidity ^0.5.17;

import '../Honey.sol';

contract L1Issuance {

    Honey public honey;
    address public l2IssuanceAddress;
    address public l2GovernanceAddress;
    mapping(uint256 => bool) public issuanceRequestIds;

    modifier onlyIssuanceFromL2 {
        // verify caller
        _;
    }

    modifier onlyGovernanceFromL2 {
        // verify caller
        _;
    }

    constructor(Honey _honey, address _l2IssuanceAddress, address _l2GovernanceAddress) public {
        honey = _honey;
        l2IssuanceAddress = _l2IssuanceAddress;
        l2GovernanceAddress = _l2GovernanceAddress;
    }

    function updateIssuanceAddress(address _l2IssuanceAddress) external onlyGovernanceFromL2 {
        l2IssuanceAddress = _l2IssuanceAddress;
    }

    function updateGovernanceAddress(address _l2GovernanceAddress) external onlyGovernanceFromL2 {
        l2GovernanceAddress = _l2GovernanceAddress;
    }

    function mintHoney(uint256 _issuanceRequestId, uint256 _amount) external onlyIssuanceFromL2 {
        honey.mint(address(this), _amount);
        // send minted honey to L2Issuance
        // call finalize on L2Issuance
    }

    // Expects to have received _amount before executing
    function burnHoney(uint256 _issuanceRequestId, uint256 _amount) external onlyIssuanceFromL2 {
        require(honey.balanceOf(address(this)) >= _amount, "ERROR: No burn balance");
        honey.burn(_amount);
        // call finalize on L2Issuance
    }

    function finalizeL2Issuance(uint256 _issuanceRequestId) external {
        // call finalise on L2Issuance
    }

    function _finalizeL2Issuance()
}
