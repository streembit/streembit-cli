const https = require("https");
const { logger } = require("streembit-util");

class Cloudflare {
  constructor() {
    this.provider_name = "Cloudflare";
    this.dnsZone_id = "";
    this.domain_name = "";
    this.email = "";
    this.key = "";
  }
  getZoneId(domain, email, key) {
    this.domain_name = domain;
    this.email = email;
    this.key = key;
    const options = {
      hostname: `api.cloudflare.com`,
      port: 443,
      path: `/client/v4/zones?name=${domain}&page=1`,
      headers: {
        "X-Auth-Email": email,
        "X-Auth-Key": key,
      },
    };

    https.get(options, (response) => {
      let result = "";
      response.on("data", function (chunk) {
        result += chunk;
      });

      response.on("end", () => {
        let ids = JSON.parse(result);
        this.dnsZone_id = ids.result[0].id;
        this.getRecords(this.dnsZone_id);
      });
    });
  }
  getRecords(zone) {
    const options = {
      hostname: `api.cloudflare.com`,
      port: 443,
      path: `/client/v4/zones/${zone}/dns_records?type=A&page=1&per_page=20&order=type&direction=desc&match=all`,
      headers: {
        "X-Auth-Email": this.email,
        "X-Auth-Key": this.key,
      },
    };

    https.get(options, (response) => {
      let result = "";
      response.on("data", function (chunk) {
        result += chunk;
      });

      response.on("end", () => {
        let records = JSON.parse(result);
        logger.error(records.result.length);
      });
    });
  }
  updateDns(domain, email, key) {}
}

module.exports = Cloudflare;
