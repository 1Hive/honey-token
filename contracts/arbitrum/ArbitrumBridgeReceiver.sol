pragma solidity ^0.5.17;

import '../Honey.sol';
import './interfaces/ArbitrumGatewayRouter.sol';
import './interfaces/ArbitrumInbox.sol';
import './interfaces/ArbitrumOutbox.sol';

contract ArbitrumBridgeReceiver {

    address public constant NOT_CALLED_FROM_BRIDGE_ADDRESS = address(1);

    Honey public honey;
    address public l2IssuanceAddress;
    address public l2GovernanceAddress;
    ArbitrumGatewayRouter public arbitrumGatewayRouter;
    ArbitrumInbox public arbitrumInbox;

    event IssuanceAddressUpdated(address oldAddress, address newAddress);
    event GovernanceAddressUpdated(address oldAddress, address newAddress);
    event ArbitrumInboxUpdated(ArbitrumInbox oldInbox, ArbitrumInbox newInbox);

    // TODO: remove msg.sender backup governor or ensure that the l2GovernanceAddress cannot be created as a contract
    // using the EOA that created the L2 Governor on the L1.
    modifier onlyGovernanceFromL2 {
        require(_getL2toL1Sender() == l2GovernanceAddress || msg.sender == l2GovernanceAddress, "ERROR: Not governance");
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
        emit GovernanceAddressUpdated(l2GovernanceAddress, _l2GovernanceAddress);
        l2GovernanceAddress = _l2GovernanceAddress;
    }

    function updateIssuanceAddress(address _l2IssuanceAddress) external onlyGovernanceFromL2 {
        emit IssuanceAddressUpdated(l2IssuanceAddress, _l2IssuanceAddress);
        l2IssuanceAddress = _l2IssuanceAddress;
    }

    function updateArbitrumInbox(ArbitrumInbox _arbitrumInbox) external onlyGovernanceFromL2 {
        emit ArbitrumInboxUpdated(arbitrumInbox, _arbitrumInbox);
        arbitrumInbox = _arbitrumInbox;
    }

    function updateHoneyIssuer(address _issuer) external onlyGovernanceFromL2 {
        honey.changeIssuer(_issuer);
    }

    function updateHoneyGatewaySetter(address _gatewaySetter) external onlyGovernanceFromL2 {
        honey.changeGatewaySetter(_gatewaySetter);
    }

    function updateHoneyGatewayRouter(ArbitrumGatewayRouter _gatewayRouter) external onlyGovernanceFromL2 {
        honey.changeGatewayRouter(_gatewayRouter);
    }

    function updateHoneyGateway(ArbitrumCustomGateway _gateway) external onlyGovernanceFromL2 {
        honey.changeGateway(_gateway);
    }

    function mintHoney(uint256 _amount) external onlyIssuanceFromL2 {
        address honeyGateway = arbitrumGatewayRouter.l1TokenToGateway(address(honey));
        honey.mint(honeyGateway, _amount);
    }

    function burnHoney(uint256 _amount) external onlyIssuanceFromL2 {
        address honeyGateway = arbitrumGatewayRouter.l1TokenToGateway(address(honey));
        honey.burn(honeyGateway, _amount);
    }

    function _getL2toL1Sender() internal view returns (address) {
        ArbitrumOutbox arbitrumOutbox = ArbitrumOutbox(arbitrumInbox.bridge().activeOutbox());
        return address(arbitrumOutbox) == address(0) ? NOT_CALLED_FROM_BRIDGE_ADDRESS : arbitrumOutbox.l2ToL1Sender();
    }
}
