pragma solidity ^0.5.17;

contract GatewayMock {

    address public l2Address;
    uint256 public maxGas;
    uint256 public gasPriceBid;
    uint256 public maxSubmissionCost;

    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost
    ) external payable returns (uint256) {
        l2Address = _l2Address;
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;
        maxSubmissionCost = _maxSubmissionCost;
        return 10;
    }
}
