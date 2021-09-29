pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumGatewayRouter.sol";

contract ArbitrumGatewayRouterMock is ArbitrumGatewayRouter {

    mapping(address => address) public l1TokenToGateway;

    constructor(address _l1Token, address _gateway) public {
        l1TokenToGateway[_l1Token] = _gateway;
    }

    function setGateway(
        ArbitrumCustomGateway _gateway,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost
    ) external payable returns (uint256) {
        return 0;
    }
}
