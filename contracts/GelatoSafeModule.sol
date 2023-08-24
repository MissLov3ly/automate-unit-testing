// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.12;

import "./GelatoBytes.sol";
import {IAutomate} from "./interfaces/IAutomate.sol";
import {IOpsProxyFactory} from "./interfaces/IOpsProxyFactory.sol";
import {ISafe} from "./interfaces/ISafe.sol";
import {IMultiSend} from "./interfaces/IMultiSend.sol";

contract GelatoSafeModule {
    using GelatoBytes for bytes;

    struct TxSpec {
        address to;
        bytes4 selector;
        bool hasValue;
        ISafe.Operation operation;
    }

    struct Tx {
        address to;
        bytes data;
        uint256 value;
        ISafe.Operation operation;
    }



    address private constant OPS_PROXY_FACTORY = 0xC815dB16D4be6ddf2685C201937905aBf338F5D7;

    address private constant MULTISEND = 0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761;

    mapping(bytes32 => address) whitelistedTransactions;

  
    modifier onlyDedicatedMsgSender(address _safe) {
        (address dedicatedMsgSender, ) = IOpsProxyFactory(OPS_PROXY_FACTORY).getProxyOf(_safe);
        require(msg.sender == dedicatedMsgSender, "Only dedicated msg.sender");
        _;
    }

    // Execute Transaction via dedicated Gelato msg.sender
    function execute(address _safe,Tx[] calldata _txs) external onlyDedicatedMsgSender(_safe) {
      
        Tx memory execTx = getExecTx(_txs);

        (bool success, bytes memory returnData) = ISafe(_safe).execTransactionFromModuleReturnData(
            execTx.to,
            execTx.value,
            execTx.data,
            execTx.operation
        );

        if (!success) returnData.revertWithError("GelatoSafeModule: module exec reverted: ");
    }

    function getExecTx(Tx[] calldata _txs) public pure returns (Tx memory execTx) {
        if (_txs.length > 1) {
            bytes memory multiSendData;

            for (uint256 i; i < _txs.length; i++) {
                // Multisends get encoded as follows: "uint8", "address", "uint256", "uint256", "bytes"],
                Tx memory memTx = _txs[i];
                multiSendData = abi.encodePacked(
                    multiSendData,
                    uint8(memTx.operation),
                    memTx.to,
                    memTx.value,
                    memTx.data.length,
                    memTx.data
                );
            }
            execTx = Tx({
                to: MULTISEND,
                value: 0, // we are doing a delegatecall, so no need to send value
                data: abi.encodeWithSelector(IMultiSend.multiSend.selector, multiSendData),
                operation: ISafe.Operation.DelegateCall
            });
        } else {
            execTx = Tx({to: _txs[0].to, value: _txs[0].value, data: _txs[0].data, operation: _txs[0].operation});
        }
    }

}
