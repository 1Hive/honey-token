pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumGatewayRouter.sol";

contract GatewayRouterMock is ArbitrumGatewayRouter {

    ArbitrumCustomGateway public gateway;
    uint256 public maxGas;
    uint256 public gasPriceBid;
    uint256 public maxSubmissionCost;

    function setGateway(
        ArbitrumCustomGateway _gateway,
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
