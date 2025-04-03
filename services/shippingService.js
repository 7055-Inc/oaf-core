require('dotenv').config();
const axios = require('axios');

class ShippingService {
    async getUspsToken() {
        if (!process.env.USPS_CLIENT_ID || !process.env.USPS_CLIENT_SECRET) {
            throw new Error('Missing USPS credentials');
        }
        const response = await axios.post('https://apis.usps.com/oauth2/v3/token',
            `grant_type=client_credentials&client_id=${process.env.USPS_CLIENT_ID}&client_secret=${process.env.USPS_CLIENT_SECRET}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data.access_token;
    }

    async getUspsServices() {
        const fallbackServices = [
            { provider: 'USPS', service: 'First-Class Mail', code: 'usps_FIRST_CLASS_MAIL' },
            { provider: 'USPS', service: 'Priority Mail', code: 'usps_PRIORITY_MAIL' },
            { provider: 'USPS', service: 'Priority Mail Express', code: 'usps_PRIORITY_MAIL_EXPRESS' },
            { provider: 'USPS', service: 'Ground Advantage', code: 'usps_GROUND_ADVANTAGE' }
        ];
        try {
            if (!process.env.USPS_CLIENT_ID || !process.env.USPS_CLIENT_SECRET) {
                console.warn('USPS credentials missing, using fallback services');
                return fallbackServices;
            }
            const token = await this.getUspsToken();
            const response = await axios.post('https://apis.usps.com/shipments/v3/options/search', {
                originZIPCode: '94105',
                destinationZIPCode: '10001',
                packageDescription: {
                    weight: 1,
                    length: 10,
                    width: 5,
                    height: 5,
                    mailClass: 'ALL'
                },
                pricingOptions: [{ priceType: 'COMMERCIAL' }],
                mailingDate: new Date().toISOString().split('T')[0]
            }, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            return response.data.pricingOptions[0].shippingOptions.map(option => ({
                provider: 'USPS',
                service: option.mailClass.replace(/_/g, ' '),
                code: `usps_${option.mailClass.toUpperCase().replace(/\s+/g, '_')}`
            }));
        } catch (error) {
            console.error('USPS API Error:', error.message);
            console.warn('Using USPS fallback services');
            return fallbackServices;
        }
    }

    async getUpsToken() {
        if (!process.env.UPS_CLIENT_ID || !process.env.UPS_CLIENT_SECRET) {
            throw new Error('Missing UPS credentials');
        }
        const auth = Buffer.from(`${process.env.UPS_CLIENT_ID}:${process.env.UPS_CLIENT_SECRET}`).toString('base64');
        const response = await axios.post('https://wwwcie.ups.com/security/v1/oauth/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-merchant-id': process.env.UPS_CLIENT_ID
                }
            }
        );
        return response.data.access_token;
    }

    async getUpsServices() {
        const fallbackServices = [
            { provider: 'UPS', service: 'Ground', code: 'ups_03' },
            { provider: 'UPS', service: '2nd Day Air', code: 'ups_02' },
            { provider: 'UPS', service: 'Next Day Air', code: 'ups_01' },
            { provider: 'UPS', service: '3 Day Select', code: 'ups_12' }
        ];
        try {
            if (!process.env.UPS_CLIENT_ID || !process.env.UPS_CLIENT_SECRET) {
                console.warn('UPS credentials missing, using fallback services');
                return fallbackServices;
            }
            const token = await this.getUpsToken();
            const response = await axios.post('https://wwwcie.ups.com/api/rating/v1/Shop',
                {
                    RateRequest: {
                        Shipment: {
                            Shipper: { Address: { PostalCode: '94105', CountryCode: 'US' } },
                            ShipTo: { Address: { PostalCode: '10001', CountryCode: 'US' } },
                            Package: [{
                                PackagingType: { Code: '02' },
                                PackageWeight: { UnitOfMeasurement: { Code: 'LBS' }, Weight: '1' }
                            }]
                        }
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'transId': `${Date.now()}`,
                        'transactionSrc': 'testing'
                    }
                }
            );
            return response.data.RateResponse.RatedShipment.map(shipment => {
                const code = shipment.Service.Code;
                const serviceMap = {
                    '03': 'Ground',
                    '02': '2nd Day Air',
                    '01': 'Next Day Air',
                    '12': '3 Day Select',
                    '59': '2nd Day Air A.M.',
                    '16': 'Worldwide Express',
                    '07': 'Worldwide Express Plus',
                    '08': 'Worldwide Expedited'
                };
                return {
                    provider: 'UPS',
                    service: shipment.Service.Description || serviceMap[code] || `Unknown (${code})`,
                    code: `ups_${code}`
                };
            });
        } catch (error) {
            console.error('UPS API Error:', error.message);
            console.warn('Using UPS fallback services');
            return fallbackServices;
        }
    }

    async getFedExServices() {
        const fallbackServices = [
            { provider: 'FedEx', service: 'Ground', code: 'fedex_FEDEX_GROUND' },
            { provider: 'FedEx', service: '2 Day', code: 'fedex_FEDEX_2_DAY' },
            { provider: 'FedEx', service: 'Express Saver', code: 'fedex_FEDEX_EXPRESS_SAVER' },
            { provider: 'FedEx', service: 'First Overnight', code: 'fedex_FIRST_OVERNIGHT' }
        ];
        try {
            if (!process.env.FEDEX_API_KEY || !process.env.FEDEX_API_SECRET || !process.env.FEDEX_ACCOUNT_NUMBER) {
                console.warn('FedEx credentials missing, using fallback services');
                return fallbackServices;
            }
            const tokenResponse = await axios.post('https://apis-sandbox.fedex.com/oauth/token',
                `grant_type=client_credentials&client_id=${process.env.FEDEX_API_KEY}&client_secret=${process.env.FEDEX_API_SECRET}`,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            const token = tokenResponse.data.access_token;
            const response = await axios.post('https://apis-sandbox.fedex.com/rate/v1/rates/quotes',
                {
                    accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
                    requestedShipment: {
                        shipper: { address: { postalCode: '94105', countryCode: 'US' } },
                        recipient: { address: { postalCode: '10001', countryCode: 'US' } },
                        packageLineItems: [{ weight: { units: 'LB', value: 1 } }]
                    }
                },
                {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                }
            );
            return response.data.output.rateReplyDetails.map(detail => ({
                provider: 'FedEx',
                service: detail.serviceName,
                code: `fedex_${detail.serviceType}`
            }));
        } catch (error) {
            console.error('FedEx API Error:', error.message);
            console.warn('Using FedEx fallback services');
            return fallbackServices;
        }
    }

    async getAvailableServices() {
        const uspsServices = await this.getUspsServices();
        const upsServices = await this.getUpsServices();
        const fedexServices = await this.getFedExServices();
        return [...uspsServices, ...upsServices, ...fedexServices];
    }

    async getShippingOptions(packages) {
        const validPackages = packages.filter(pkg => 
            pkg.length && pkg.width && pkg.height && pkg.weight && pkg.dimensionUnit && pkg.weightUnit
        );
        if (!validPackages.length) return this.getAvailableServices();

        const allServices = [];

        for (const pkg of validPackages) {
            const services = [];
            const dimFactor = pkg.dimensionUnit === 'cm' ? 0.393701 : 1;
            const weightFactor = pkg.weightUnit === 'kg' ? 2.20462 : 1;
            const lengthIn = Number(pkg.length) * dimFactor;
            const widthIn = Number(pkg.width) * dimFactor;
            const heightIn = Number(pkg.height) * dimFactor;
            const weightLb = Number(pkg.weight) * weightFactor;

            // USPS
            if (process.env.USPS_CLIENT_ID && process.env.USPS_CLIENT_SECRET) {
                try {
                    const token = await this.getUspsToken();
                    const uspsResponse = await axios.post('https://apis.usps.com/shipments/v3/options/search', {
                        originZIPCode: pkg.originZip || '94105',
                        destinationZIPCode: pkg.destinationZip || '10001',
                        packageDescription: {
                            weight: Math.ceil(weightLb),
                            length: lengthIn,
                            width: widthIn,
                            height: heightIn,
                            mailClass: 'ALL'
                        },
                        pricingOptions: [{ priceType: 'COMMERCIAL' }],
                        mailingDate: new Date().toISOString().split('T')[0]
                    }, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                    });
                    services.push(...uspsResponse.data.pricingOptions[0].shippingOptions.map(option => ({
                        provider: 'USPS',
                        service: option.mailClass.replace(/_/g, ' '),
                        code: `usps_${option.mailClass.toUpperCase().replace(/\s+/g, '_')}`
                    })));
                } catch (error) {
                    console.error('USPS Error Details:', error.response?.status, error.response?.data || error.message);
                    services.push(...[
                        { provider: 'USPS', service: 'First-Class Mail', code: 'usps_FIRST_CLASS_MAIL' },
                        { provider: 'USPS', service: 'Priority Mail', code: 'usps_PRIORITY_MAIL' },
                        { provider: 'USPS', service: 'Priority Mail Express', code: 'usps_PRIORITY_MAIL_EXPRESS' },
                        { provider: 'USPS', service: 'Ground Advantage', code: 'usps_GROUND_ADVANTAGE' }
                    ]);
                }
            } else {
                console.warn('USPS credentials missing, using fallback');
                services.push(...[
                    { provider: 'USPS', service: 'First-Class Mail', code: 'usps_FIRST_CLASS_MAIL' },
                    { provider: 'USPS', service: 'Priority Mail', code: 'usps_PRIORITY_MAIL' },
                    { provider: 'USPS', service: 'Priority Mail Express', code: 'usps_PRIORITY_MAIL_EXPRESS' },
                    { provider: 'USPS', service: 'Ground Advantage', code: 'usps_GROUND_ADVANTAGE' }
                ]);
            }

            // UPS
            if (process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET) {
                try {
                    const token = await this.getUpsToken();
                    const requestPayload = {
                        Request: {
                            TransactionReference: { CustomerContext: 'Shipping Options' }
                        },
                        RateRequest: {
                            Shipment: {
                                Shipper: { Address: { PostalCode: pkg.originZip || '94105', CountryCode: 'US' } },
                                ShipTo: { Address: { PostalCode: pkg.destinationZip || '10001', CountryCode: 'US' } },
                                Package: [{
                                    PackagingType: { Code: '02' },
                                    Dimensions: {
                                        UnitOfMeasurement: { Code: 'IN' },
                                        Length: lengthIn.toString(),
                                        Width: widthIn.toString(),
                                        Height: heightIn.toString()
                                    },
                                    PackageWeight: {
                                        UnitOfMeasurement: { Code: 'LBS' },
                                        Weight: weightLb.toFixed(1)
                                    }
                                }]
                            }
                        }
                    };
                    const upsResponse = await axios.post('https://wwwcie.ups.com/api/rating/v1/Shop', requestPayload, {
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'transId': `${Date.now()}`, 'transactionSrc': 'testing' }
                    });
                    services.push(...upsResponse.data.RateResponse.RatedShipment.map(shipment => {
                        const code = shipment.Service.Code;
                        const serviceMap = {
                            '03': 'Ground',
                            '02': '2nd Day Air',
                            '01': 'Next Day Air',
                            '12': '3 Day Select',
                            '59': '2nd Day Air A.M.',
                            '16': 'Worldwide Express',
                            '07': 'Worldwide Express Plus',
                            '08': 'Worldwide Expedited'
                        };
                        return {
                            provider: 'UPS',
                            service: shipment.Service.Description || serviceMap[code] || `Unknown (${code})`,
                            code: `ups_${code}`
                        };
                    }));
                } catch (error) {
                    console.error('UPS Error:', error.message);
                    console.error('UPS Error Details:', error.response?.data || error.message);
                    services.push(...[
                        { provider: 'UPS', service: 'Ground', code: 'ups_03' },
                        { provider: 'UPS', service: '2nd Day Air', code: 'ups_02' },
                        { provider: 'UPS', service: 'Next Day Air', code: 'ups_01' },
                        { provider: 'UPS', service: '3 Day Select', code: 'ups_12' }
                    ]);
                }
            } else {
                console.warn('UPS credentials missing, using fallback');
                services.push(...[
                    { provider: 'UPS', service: 'Ground', code: 'ups_03' },
                    { provider: 'UPS', service: '2nd Day Air', code: 'ups_02' },
                    { provider: 'UPS', service: 'Next Day Air', code: 'ups_01' },
                    { provider: 'UPS', service: '3 Day Select', code: 'ups_12' }
                ]);
            }

            // FedEx
            if (process.env.FEDEX_API_KEY && process.env.FEDEX_API_SECRET && process.env.FEDEX_ACCOUNT_NUMBER) {
                try {
                    const tokenResponse = await axios.post('https://apis-sandbox.fedex.com/oauth/token',
                        `grant_type=client_credentials&client_id=${process.env.FEDEX_API_KEY}&client_secret=${process.env.FEDEX_API_SECRET}`,
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    );
                    const token = tokenResponse.data.access_token;
                    const fedexResponse = await axios.post('https://apis-sandbox.fedex.com/rate/v1/rates/quotes',
                        {
                            accountNumber: { value: process.env.FEDEX_ACCOUNT_NUMBER },
                            requestedShipment: {
                                shipper: { address: { postalCode: pkg.originZip || '94105', countryCode: 'US' } },
                                recipient: { address: { postalCode: pkg.destinationZip || '10001', countryCode: 'US' } },
                                packageLineItems: [{
                                    dimensions: { length: lengthIn, width: widthIn, height: heightIn, units: 'IN' },
                                    weight: { units: 'LB', value: weightLb }
                                }]
                            }
                        },
                        {
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                        }
                    );
                    services.push(...fedexResponse.data.output.rateReplyDetails.map(detail => ({
                        provider: 'FedEx',
                        service: detail.serviceName,
                        code: `fedex_${detail.serviceType}`
                    })));
                } catch (error) {
                    console.error('FedEx Error:', error.message);
                    services.push(...[
                        { provider: 'FedEx', service: 'Ground', code: 'fedex_FEDEX_GROUND' },
                        { provider: 'FedEx', service: '2 Day', code: 'fedex_FEDEX_2_DAY' },
                        { provider: 'FedEx', service: 'Express Saver', code: 'fedex_FEDEX_EXPRESS_SAVER' },
                        { provider: 'FedEx', service: 'First Overnight', code: 'fedex_FIRST_OVERNIGHT' }
                    ]);
                }
            } else {
                console.warn('FedEx credentials missing, using fallback');
                services.push(...[
                    { provider: 'FedEx', service: 'Ground', code: 'fedex_FEDEX_GROUND' },
                    { provider: 'FedEx', service: '2 Day', code: 'fedex_FEDEX_2_DAY' },
                    { provider: 'FedEx', service: 'Express Saver', code: 'fedex_FEDEX_EXPRESS_SAVER' },
                    { provider: 'FedEx', service: 'First Overnight', code: 'fedex_FIRST_OVERNIGHT' }
                ]);
            }

            allServices.push(...services);
        }

        return [...new Set(allServices.map(s => JSON.stringify(s)))].map(s => JSON.parse(s));
    }
}

module.exports = new ShippingService();