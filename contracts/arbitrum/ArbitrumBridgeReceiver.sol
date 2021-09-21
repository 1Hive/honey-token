pragma solidity ^0.5.17;

import '../Honey.sol';
import './interfaces/ArbitrumGatewayRouter.sol';
import './interfaces/ArbitrumInbox.sol';
import './interfaces/ArbitrumOutbox.sol';
import './interfaces/ArbitrumBridge.sol';

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

    // TODO: remove msg.sender backup governor for mainnet/final testing
    modifier onlyGovernanceFromL2 {
        require(_getL2ToL1Sender() == l2GovernanceAddress || msg.sender == l2GovernanceAddress, "ERR:NOT_GOVERNANCE");
        _;
    }

    modifier onlyIssuanceFromL2 {
        require(_getL2ToL1Sender() == l2IssuanceAddress, "ERR:NOT_ISSUANCE");
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

    // TODO: Replace with commented function below for mainnet/final testing, when requiring calling from bridge
    function _getL2ToL1Sender() internal view returns (address) {
        ArbitrumBridge arbitrumBridge = arbitrumInbox.bridge();

        // TODO: This allows us to call not from the bridge for easier testing
        if (address(arbitrumBridge) != msg.sender) {
            return NOT_CALLED_FROM_BRIDGE_ADDRESS;
        }

        ArbitrumOutbox arbitrumOutbox = ArbitrumOutbox(arbitrumBridge.activeOutbox());
        address l2ToL1Sender = arbitrumOutbox.l2ToL1Sender();

        require(l2ToL1Sender != address(0), "ERR:NO_SENDER");
        return l2ToL1Sender;
    }

    // @dev the l2ToL1Sender behaves as the tx.origin, the msg.sender should be validated to protect against reentrancies
//    function _getL2ToL1Sender() internal view returns (address) {
//        ArbitrumBridge arbitrumBridge = arbitrumInbox.bridge();
//        require(address(arbitrumBridge) == msg.sender, "ERR:NOT_FROM_BRIDGE");
//
//        ArbitrumOutbox arbitrumOutbox = ArbitrumOutbox(arbitrumBridge.activeOutbox());
//        address l2ToL1Sender = arbitrumOutbox.l2ToL1Sender();
//
//        require(l2ToL1Sender != address(0), "ERR:NO_SENDER");
//        return l2ToL1Sender;
//    }
}
