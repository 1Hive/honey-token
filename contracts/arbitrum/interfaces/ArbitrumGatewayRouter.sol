pragma solidity ^0.5.17;

import './ArbitrumCustomGateway.sol';

contract ArbitrumGatewayRouter {

    mapping(address => address) public l1TokenToGateway;

    function setGateway(
        ArbitrumCustomGateway _gateway,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost
    ) external payable returns (uint256);

}
