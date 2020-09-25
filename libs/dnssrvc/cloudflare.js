const https = require("https");
const { logger } = require("streembit-util");
const publicIp = require("../../apps/dns/IPv4");
class Cloudflare {
  constructor() {
    this.provider_name = "Cloudflare";
    this.dnsZone_id = "";
    this.domain_name = "";
    this.email = "";
    this.key = "";
  }
  getZoneId(domain, email, key, callback) {
    this.domain_name = domain;
    this.email = email;
    this.key = key;
    const options = {
      hostname: `api.cloudflare.com`,
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
        this.getRecords(this.dnsZone_id, callback);
      });
      response.on("error", (error) => {
        throw "Error with getting Cloudflare DNS zone id!";
      });
    });
  }
  getRecords(zone, callback) {
    const options = {
      hostname: `api.cloudflare.com`,
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
        callback(zone, records.result);
      });
      response.on("error", (error) => {
        throw "Error with getting Cloudflare DNS records!";
      });
    });
  }
  updateDns(domain, email, key, zone, publicIP, dnsNames, callback) {
    if (!domain || !email || !key || !dnsNames) {
      throw "No enought data for DNS update";
    } else {
      for (let i = 0; i < dnsNames.length; i++) {
        const options = {
          hostname: `api.cloudflare.com`,
          path: `/client/v4/zones/${zone}/dns_records/${dnsNames[i].id}`,
          headers: {
            "X-Auth-Email": this.email,
            "X-Auth-Key": this.key,
            "Content-Type": "application/json",
          },
          method: "PUT",
          data: `{"type":"A","name":"${dnsNames[i].name}","content":"${publicIP}"}`,
        };

        const req = https.request(options, (response) => {
          let result = "";
          response.on("data", function (chunk) {
            result += chunk;
          });

          req.on("error", (error) => {
            throw "Error with updating Cloudflare DNS record!";
          });
        });
        req.write(options.data);
        req.end();
      }
      callback("DNS records updated");
    }
  }
}

module.exports = Cloudflare;
