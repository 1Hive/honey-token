pragma solidity ^0.5.17;

import '../Honey.sol';

contract L1Issuance {

    Honey public honey;
    address public issuanceAddress;

    modifier onlyIssuanceFromL2 {
        // verify caller
        _;
    }

    constructor(Honey _honey, address _issuanceAddress) public {
        honey = _honey;
        issuanceAddress = _issuanceAddress;
    }

    function updateIssuanceAddress(address _issuanceAddress) public {
        issuanceAddress = _issuanceAddress;
    }

    function mintHoney(uint256 _issuanceId, uint256 _amount) external onlyIssuanceFromL2 {
        honey.mint(address(this), _amount);
        // send minted honey to L2Issuance
        // call finalize on L2Issuance
    }

    // Expects to have received _amount before executing
    function burnHoney(uint256 _issuanceId, uint256 _amount) external onlyIssuanceFromL2 {
        require(honey.balanceOf(address(this)) >= _amount, "ERROR: No burn balance");
        honey.burn(_amount);
        // call finalize on L2Issuance
    }


}
