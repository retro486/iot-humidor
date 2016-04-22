/*
Connects to a preconfigured Wio server and checks the humidity of a preconfigured Wio board/module at a preconfigured interval and passes the value along to a preconfigured IFTTT Maker channel.
*/
var request = require('request');

// Config
var config = {
  interval: 1000 * 60 * 5, // 5 minutes,
  alertTimeout: 1000 * 60 * 60, // 60 minutes; time to wait before Maker channel is notified again.
  humidityThreshold: 60, // Integer for minimum humidity value before notification is sent to Maker channel
  wioServer: 'http://yoursever', // https://github.com/Seeed-Studio/Wio_Link/wiki/Server%20Deployment%20Guide
  nodeKey: '', // get this with wio-cli or Postman via the API
  makerKey: '', // https://ifttt.com/maker
  makerEvent: '' // https://ifttt.com/maker
};

var alertTimeout = false;

var check = function() {
  var conn = new request(
    config.wioServer + '/v1/node/GroveTempHumD0/humidity?access_token=' + config.nodeKey,
    function(error, response, body) {
      if(!error && response.statusCode === 200 && !alertTimeout) {
        try {
          var data = JSON.parse(body);
          
          if(data.humidity < config.humidityThreshold) {
            console.log('Humidity below threshold (' + config.humidityThreshold + '): ' + data.humidity);
            
            var makerUrl = 'https://maker.ifttt.com/trigger/' + config.makerEvent + '/with/key/' + config.makerKey;
            
            request({
              method: 'POST',
              uri: makerUrl,
              json: true,
              body: {
                'value1': data.humidity
              }
            }, function(mError, mResp, mBody) {
              if(mError) {
                console.error('Unable to post to Maker channel:\n', mError);
              } else if(mResp.statusCode !== 200) {
                console.error('Unable to post to Maker channel:\n', mResp.statusCode, mBody);
              } else {
                // Set alertTimeout to non-falsey value to avoid getting spammed.
                alertTimeout = setTimeout(function() {
                  alertTimeout = false;
                }, config.alertTimeout);
              }
            });
          } else {
            console.log('Humidity at or above threshold (' + config.humidityThreshold + '): ' + data.humidity);
          }
        } catch(e) {
          console.error('Unable to parse JSON response:', e.trace);
        }
      } else {
        if(error) {
          // Will keep trying even after failure. TODO make this smart and only retry when it makes sense (i.e., node offline)
          console.error(error);
        } else {
          console.error('Non-OK response: ', response.statusCode, '\n', body);
        }
      }
    });
};

// Check now and then schedule a check every x minutes
check();

var interval = setInterval(function() {
  check();
}, config.interval);
