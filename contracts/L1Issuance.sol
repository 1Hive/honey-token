pragma solidity ^0.5.17;

import '../Honey.sol';
import './arbitrum/ArbitrumInbox.sol';
import './arbitrum/ArbitrumOutbox.sol';
import './arbitrum/ArbitrumGatewayRouter.sol';

contract L1Issuance {

    Honey public honey;
    address public l2IssuanceAddress;
    address public l2GovernanceAddress;
    ArbitrumInbox public arbitrumInbox;
    ArbitrumGatewayRouter public arbitrumGatewayRouter;

    event IssuanceAddressUpdated(address oldAddress, address newAddress);
    event GovernanceAddressUpdated(address oldAddress, address newAddress);

    modifier onlyGovernanceFromL2 {
        require(_getL2toL1Sender() == l2GovernanceAddress, "ERROR: Not governance");
        _;
    }

    modifier onlyIssuanceFromL2 {
        require(_getL2toL1Sender() == l2IssuanceAddress, "ERROR: Not issuance");
        _;
    }

    constructor(
        Honey _honey,
        address _l2IssuanceAddress,
        address _l2GovernanceAddress,
        ArbitrumInbox _arbitrumInbox,
        ArbitrumGatewayRouter _arbitrumGatewayRouter
    ) public {
        honey = _honey;
        l2IssuanceAddress = _l2IssuanceAddress;
        l2GovernanceAddress = _l2GovernanceAddress;
        arbitrumInbox = _arbitrumInbox;
        arbitrumGatewayRouter = _arbitrumGatewayRouter;
    }

    function updateGovernanceAddress(address _l2GovernanceAddress) external onlyGovernanceFromL2 {
        GovernanceAddressUpdated(l2GovernanceAddress, _l2GovernanceAddress);
        l2GovernanceAddress = _l2GovernanceAddress;
    }

    function updateIssuanceAddress(address _l2IssuanceAddress) external onlyGovernanceFromL2 {
        IssuanceAddressUpdated(l2IssuanceAddress, _l2IssuanceAddress);
        l2IssuanceAddress = _l2IssuanceAddress;
    }

    function mintHoney(uint256 _amount) external onlyIssuanceFromL2 {
        address honeyGateway = arbitrumGatewayRouter.l1TokenToGateway(address(honey));
        honey.mint(honeyGateway, _amount);
    }

    function burnHoney(uint256 _amount) external onlyIssuanceFromL2 {
        address honeyGateway = arbitrumGatewayRouter.l1TokenToGateway(address(honey));
        honey.burn(honeyGateway, _amount);
    }

    function changeHoneyIssuer(address _issuer) external onlyGovernanceFromL2 {
        honey.changeIssuer(_issuer);
    }

    function _getL2toL1Sender() internal returns (address) {
        ArbitrumOutbox arbitrumOutbox = ArbitrumOutbox(arbitrumInbox.bridge().activeOutbox());
        return arbitrumOutbox.l2ToL1Sender();
    }
}
