pragma solidity ^0.5.17;

contract GatewayRouterMock {

    address public gateway;
    uint256 public maxGas;
    uint256 public gasPriceBid;
    uint256 public maxSubmissionCost;

    function setGateway(
        address _gateway,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost
    ) external payable returns (uint256) {
        gateway = _gateway;
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;
        maxSubmissionCost = _maxSubmissionCost;
        return 10;
    }
}
