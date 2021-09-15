pragma solidity ^0.5.17;

import "../arbitrum/interfaces/ArbitrumCustomGateway.sol";
import "../Honey.sol";

contract GatewayMock is ArbitrumCustomGateway {

    address public l2Address;
    uint256 public maxGas;
    uint256 public gasPriceBid;
    uint256 public maxSubmissionCost;
    address public creditBackAddress;

    function registerTokenToL2(
        address _l2Address,
        uint256 _maxGas,
        uint256 _gasPriceBid,
        uint256 _maxSubmissionCost,
        address _creditBackAddress
    ) external payable returns (uint256) {
        l2Address = _l2Address;
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;
        maxSubmissionCost = _maxSubmissionCost;
        creditBackAddress = _creditBackAddress;

        require(Honey(msg.sender).isArbitrumEnabled() == uint8(0xa4b1), "MISSING FUNCTION");

        return 10;
    }
}
