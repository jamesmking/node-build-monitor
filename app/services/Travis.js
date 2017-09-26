var request = require('request'),
    async = require('async');

module.exports = function () {
    var self = this,
        requestBuilds = function (callback) {
            request({
                'url': 'https://api.' + self.configuration.url + '/repos/' + self.configuration.slug + '/builds?access_token=' + self.configuration.token,
                'json' : true
                },
                function(error, response, body) {
                    callback(error, body);
            });
        },
        requestBuild = function (build, callback) {
            request({
                'url': 'https://api.' + self.configuration.url + '/repos/' + self.configuration.slug + '/builds/' + build.id + '?access_token=' + self.configuration.token,
                'json' : true
                },
                function(error, response, body) {
                  if (error) {
                    callback(error);
                    return;
                  }

                  callback(error, simplifyBuild(body));
                });
        },
        queryBuilds = function (callback) {
            requestBuilds(function (error, body) {
                if (error) {
                  callback(error);
                  return;
                }

                async.map(body, requestBuild, function (error, results) {
                    callback(error, results);
                });
            });
        },
        parseDate = function (dateAsString) {
            return new Date(dateAsString);
        },
        getStatus = function (result, state) {
            if (state === 'started') return "#937731";
            if (state === 'created') return "#617fc7";
            if (state === 'canceled') return "#949094";
            if (result === null || result === 1) return "#993e47";
            if (result === 0) return "#4e8156";

            return null;
        },
        simplifyBuild = function (res) {
            return {
                id: self.configuration.slug + '|' + res.number,
                project: self.configuration.slug,
                number: res.number,
                isRunning: res.state === 'started',
                startedAt: parseDate(res.started_at),
                finishedAt: parseDate(res.finished_at),
                requestedFor: res.author_name,
                status: getStatus(res.result, res.state),
                statusText: res.state,
                reason: res.event_type,
                hasErrors: false,
                hasWarnings: false,
                url: 'https://' + self.configuration.url + '/' + self.configuration.slug + '/builds/' + res.id
            };
        };

    self.configure = function (config) {
        self.configuration = config;

        self.configuration.url = self.configuration.url || 'travis-ci.org';
        self.configuration.token = self.configuration.token || '';

        if (typeof self.configuration.caPath !== 'undefined') {
            request = request.defaults({
                agentOptions: {
                    ca: require('fs').readFileSync(self.configuration.caPath).toString().split("\n\n")
                }
            });
        }
    };

    self.check = function (callback) {
        queryBuilds(callback);
    };
};
