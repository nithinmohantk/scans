var async = require('async');
var helpers = require('../../../helpers/azure/');

module.exports = {
    title: 'Storage Accounts Encryption',
    category: 'Storage Accounts',
    description: 'Ensures encryption is enabled for Storage Accounts',
    more_info: 'Storage accounts can be configured to encrypt data-at-rest. By default Azure will create a set of keys to encrypt the storage account, but the recommended approach is to create your own keys using Azure Key Vault.',
    recommended_action: 'Ensure all Storage Accounts are configured with a BYOK key.',
    link: 'https://docs.microsoft.com/en-us/azure/storage/common/storage-service-encryption-customer-managed-keys',
    apis: ['storageAccounts:list'],
    compliance: {
        hipaa: 'HIPAA requires that all data is encrypted, including data at rest. ' +
                'Enabling encryption of storage account data helps to protect this data.',
        pci: 'PCI requires proper encryption of cardholder data at rest. ' +
             'Encryption should be enabled for all storage accounts storing this ' +
             'type of data.'
    },

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var locations = helpers.locations(settings.govcloud);

        async.each(locations.storageAccounts, function(location, rcb){
            var storageAccount = helpers.addSource(cache, source,
                ['storageAccounts', 'list', location]);

            if (!storageAccount) return rcb();

            if (storageAccount.err || !storageAccount.data) {
                helpers.addResult(results, 3,
                    'Unable to query for Storage Accounts: ' + helpers.addError(storageAccount), location);
                return rcb();
            }

            if (!storageAccount.data.length) {
                helpers.addResult(results, 0, 'No storage accounts found', location);
            } else {
                for (acct in storageAccount.data) {
                    var account = storageAccount.data[acct];

                    if (account.encryption && account.encryption.keySource &&
                        account.encryption.keySource == "Microsoft.Keyvault") {
                        helpers.addResult(results, 0, 'Storage Account encryption is configured with Microsoft Key vault', location, account.id);
                    } else if (account.encryption && account.encryption.keySource &&
                        account.encryption.keySource == "Microsoft.Storage") {
                        helpers.addResult(results, 2, 'Storage Account encryption is configured using Microsoft Default Storage Keys', location, account.id);
                    } else {
                        helpers.addResult(results, 2, 'Storage Account is not configured for data-at-rest encryption', location, account.id);
                    }
                }
            }
            rcb();
        }, function(){
            // Global checking goes here
            callback(null, results, source);
        });
    }
};