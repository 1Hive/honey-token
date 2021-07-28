pragma solidity ^0.5.17;

contract ArbitrumCustomGateway {

    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost
    ) external payable returns (uint256);
}
