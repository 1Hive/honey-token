//pragma solidity ^0.5.17;
//
//import '../Honey.sol';
//import './ArbitrumInbox.sol';
//import './ArbitrumOutbox.sol';
//import './ArbitrumGateway.sol';
//import './ArbitrumGatewayRouter.sol';
//
//contract L1Issuance {
//
//    string constant public L2_FINALISE_ISSUANCE_FUNCTION = "finaliseIssuance(uint256)";
//
//    Honey public honey;
//    address public l2IssuanceAddress;
//    address public l2GovernanceAddress;
//    ArbitrumInbox public arbitrumInbox;
//    ArbitrumGatewayRouter public arbitrumGatewayRouter;
//    mapping(uint256 => uint256) public mintIssuanceRequestIds; // issuanceRequestId to amountToMint
//    mapping(uint256 => bool) public burnIssuanceRequestIds;
//    mapping(uint256 => uint256) public finaliseIssuanceLatestTicket; // issuanceRequestId to LatestRetryableTicketId
//
//    modifier onlyIssuanceFromL2 {
//        require(_getL2toL1Sender() == l2IssuanceAddress, "ERROR: Not issuance");
//        _;
//    }
//
//    modifier onlyGovernanceFromL2 {
//        require(_getL2toL1Sender() == l2GovernanceAddress, "ERROR: Not governance");
//        _;
//    }
//
//    constructor(
//        Honey _honey,
//        address _l2IssuanceAddress,
//        address _l2GovernanceAddress,
//        ArbitrumInbox _arbitrumInbox,
//        ArbitrumGatewayRouter _arbitrumGatewayRouter
//    ) public {
//        honey = _honey;
//        l2IssuanceAddress = _l2IssuanceAddress;
//        l2GovernanceAddress = _l2GovernanceAddress;
//        arbitrumInbox = _arbitrumInbox;
//        arbitrumGatewayRouter = _arbitrumGatewayRouter;
//    }
//
//    function updateIssuanceAddress(address _l2IssuanceAddress) external onlyGovernanceFromL2 {
//        l2IssuanceAddress = _l2IssuanceAddress;
//    }
//
//    function updateGovernanceAddress(address _l2GovernanceAddress) external onlyGovernanceFromL2 {
//        l2GovernanceAddress = _l2GovernanceAddress;
//    }
//
//    function mintHoney(uint256 _issuanceRequestId, uint256 _amount) external onlyIssuanceFromL2 {
//        require(!issuanceRequestIds[_issuanceRequestId], "ERROR: Duplicate request");
//
//        mintIssuanceRequestIds[_issuanceRequestId] = _amount;
//        honey.mint(address(this), _amount);
//        // send minted honey to L2Issuance
//    }
//
//    // Expects to have received _amount before executing
//    function burnHoney(uint256 _issuanceRequestId, uint256 _amount) external onlyIssuanceFromL2 {
//        require(honey.balanceOf(address(this)) >= _amount, "ERROR: No burn balance");
//        require(!issuanceRequestIds[_issuanceRequestId], "ERROR: Duplicate request");
//
//        issuanceRequestIds[_issuanceRequestId] = true;
//        honey.burn(_amount);
//    }
//
//    // Get maxSubmissionCost from ArbRetryableTx.getSubmissionPrice on Arbitrum chain (or arb-ts lib)
//    // Get maxGas and gasPriceBid from NodeInterface.estimateRetryableTicket (requires correct maxSubmissionCost)
//    function finaliseL2Issuance(
//        uint256 _issuanceRequestId,
//        uint256 _maxSubmissionCost,
//        uint256 _maxGas,
//        uint256 _gasPriceBid
//    ) public payable {
//        require(issuanceRequestIds[_issuanceRequestId], "ERROR: Unused issuance id");
//
//        uint256 l2CallValue = 0;
//        address excessFeeRefundAddress = msg.sender;
//        address callValueRefundAddress = msg.sender;
//        bytes memory data = abi.encodeWithSignature(L2_FINALISE_ISSUANCE_FUNCTION, _issuanceRequestId);
//
//        finaliseIssuanceLatestTicket[_issuanceRequestId] = arbitrumInbox.createRetryableTicket.value(msg.value)(
//            l2IssuanceAddress,
//            l2CallValue,
//            _maxSubmissionCost,
//            excessFeeRefundAddress,
//            callValueRefundAddress,
//            _maxGas,
//            _gasPriceBid,
//            data
//        );
//    }
//
//    function _getL2toL1Sender() internal returns (address) {
//        ArbitrumOutbox arbitrumOutbox = ArbitrumOutbox(arbitrumInbox.bridge().activeOutbox());
//        return arbitrumOutbox.l2ToL1Sender();
//    }
//
//    // investigate use of max gas and whether it limits execution
//    function sendHoneyToL2Issuance(
//        uint256 _issuanceRequestId,
//        uint256 _maxGas,
//        uint256 _gasPriceBid
//    ) external {
//        ArbitrumGateway arbitrumGateway = ArbitrumGateway(arbitrumGatewayRouter.l1TokenToGateway(address(honey)));
//
//        uint256 amount = mintIssuanceRequestIds[_issuanceRequestId];
//        // TODO: encode outbound data instead of ""
//        arbitrumGateway.outboundTransfer(address(honey), l2IssuanceAddress, amount, _maxGas, _gasPriceBid, "");
//    }
//}
