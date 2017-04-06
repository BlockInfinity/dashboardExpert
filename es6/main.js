import _ from 'lodash'

const periodDelta = 10;
const socketIO = 'http://dexapi.westeurope.cloudapp.azure.com:8080';
const restEndpoint = 'http://dexapi.westeurope.cloudapp.azure.com:8080';
const numCollaterals = 10;

// don't touch below this line

var currentState = null;
var currentPeriod = null;
var orderChart = null;
var reserveOrderChart = null;
var priceChart = null;
var settlementsChart = null;
var collateralChart = null;

var orderAskData = [];
var orderBidData = [];
var reserveOrderAskData = [];
var reserveOrderBidData = [];
var matchingPriceData = [];
var reserveAskPriceData = [];
var reserveBidPriceData = [];
var consumerOrderdVolumeData = [];
var consumerActualVolumeData = [];
var producerOrderdVolumeData = [];
var producerActualVolumeData = [];
var consumerPreviousCollateralData = [];
var consumerActualCollateralData = [];
var producerPreviousCollateralData = [];
var producerActualCollateralData = [];

var userAddressesProducerData = [];
var userAddressesConsumerData = [];

function getState() {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/state').done(function(data) {
        resolve(data);
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getAskOrders(period) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/askOrders?period=' + period).done(function(data) {
        resolve(data);
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getBidOrders(period) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/bidOrders?period=' + period).done(function(data) {
        resolve(data);
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getReserveAskOrders(period) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/reserveAskOrders?period=' + period).done(function(data) {
        resolve(data);
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getReserveBidOrders(period) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/reserveBidOrders?period=' + period).done(function(data) {
        resolve(data);
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getMatchingPrices(end, offset) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/allMatchingPrices').done(function(data) {
        resolve(_.filter(data, function(d) { return d.period > end - offset && d.period <= end; }));
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getAllReserveAskPrices(end, offset) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/allReserveAskPrices').done(function(data) {
        resolve(_.filter(data, function(d) { return d.period > end - offset && d.period <= end; }));
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getAllReserveBidPrices(end, offset) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/allReserveBidPrices').done(function(data) {
        resolve(_.filter(data, function(d) { return d.period > end - offset && d.period <= end; }));
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function getCollaterals(userAddress) {
  return new Promise(function(resolve, reject) {
    $.getJSON(restEndpoint + '/info/collateral?userAddress=' + userAddress).done(function(data) {
        resolve({ userAdress: userAddress, collateral: data.collateral });
      })
      .fail(function(err) {
        reject(err);
      });
  });
}

function fetchProducerCollaterals(cb) {
    var collaterals = [];
    var num = userAddressesProducerData.length >= numCollaterals ? numCollaterals : userAddressesProducerData.length;
    for (var i=0;i<num;i++) {
        getCollaterals(userAddressesProducerData[i]).catch(function(err) {
            cb(new Error('unable to fetchProducerCollaterals'));
        }).then(function(data) {
            collaterals.push(data);
            if (collaterals.length === numCollaterals) {
                cb(collaterals);
            }
        });
    }
}

function fetchConsumerCollaterals(cb) {
    var collaterals = [];
    var num = userAddressesConsumerData.length >= numCollaterals ? numCollaterals : userAddressesConsumerData.length;
    for (var i=0;i<num;i++) {
        getCollaterals(userAddressesConsumerData[i]).catch(function(err) {
            cb(new Error('unable to fetchConsumerCollaterals'));
        }).then(function(data) {
            collaterals.push(data);
            if (collaterals.length === numCollaterals) {
                cb(collaterals);
            }
        });
    }
}

function requestData(cb) {
    // fetch state first
    getState().catch(function(err) {
        cb(new Error('unable to fetch state'));
    })
    .then(function(data) {
        // set state and period
        currentState = data.state;
        currentPeriod = data.period;

        // fetch askOrders, bidOrders, reserveAskOrders, reserveBidOrders of current period
        getAskOrders(currentPeriod).catch(function(err) {
            cb(new Error('unable to fetch ask orders for period ' + currentPeriod));
        }).then(function(data) {
            _.each(data, function(d) {
                addOrderAskTable(currentPeriod, d.price, d.volume);
            });
            orderAskData = _.map(data, function(d) { return { x: d.price, y: d.volume }});
            orderAskData = _.sortBy(orderAskData, function(d) { return d.x });
            orderAskData = _.reverse(orderAskData);

            getBidOrders(currentPeriod).catch(function(err) {
                cb(new Error('unable to fetch bid orders for period ' + currentPeriod));
            }).then(function(data) {
                _.each(data, function(d) {
                    addOrderBidTable(currentPeriod, d.price, d.volume);
                });
                orderBidData = _.map(data, function(d) { return { x: d.price, y: d.volume }});
                orderBidData = _.sortBy(orderBidData, function(d) { return d.x });

                getReserveAskOrders(currentPeriod).catch(function(err) {
                    cb(new Error('unable to fetch reserve ask orders for period ' + currentPeriod));
                }).then(function(data) {
                    _.each(data, function(d) {
                        addReserveOrderAskTable(currentPeriod, d.price, d.volume);
                    });
                    reserveOrderAskData = _.map(data, function(d) { return { x: d.price, y: d.volume }});
                    reserveOrderAskData = _.sortBy(reserveOrderAskData, function(d) { return d.x });
                    reserveOrderAskData = _.reverse(reserveOrderAskData); 

                    getReserveBidOrders(currentPeriod).catch(function(err) {
                        cb(new Error('unable to fetch reserve bid orders for period ' + currentPeriod));
                    }).then(function(data) {
                        _.each(data, function(d) {
                            addReserveOrderBidTable(currentPeriod, d.price, d.volume);
                        });
                        reserveOrderBidData = _.map(data, function(d) { return { x: d.price, y: d.volume }});
                        reserveOrderBidData = _.sortBy(reserveOrderBidData, function(d) { return d.x });

                        getMatchingPrices(currentPeriod, periodDelta).catch(function(err) {
                            cb(new Error('unable to fetch matching prices for interval ' + currentPeriod + ' and ' + currentPeriod + periodDelta - 1));
                        }).then(function(data) {
                            _.each(data, function(d) {
                                addMatchingPriceTable(d.period, d.price);
                            });
                            matchingPriceData = _.map(data, function(d) { return { x: d.period, y: d.price }});
                            matchingPriceData = _.sortBy(matchingPriceData, function(d) { return d.x });

                            getAllReserveAskPrices(currentPeriod, periodDelta).catch(function(err) {
                                cb(new Error('unable to fetch reserve ask prices for interval ' + currentPeriod + ' and ' + currentPeriod + periodDelta - 1));
                            }).then(function(data) {
                                _.each(data, function(d) {
                                    addReserveOrderAskPriceTable(d.period, d.price);
                                });
                                reserveAskPriceData = _.map(data, function(d) { return { x: d.period, y: d.price }});
                                reserveAskPriceData = _.sortBy(reserveAskPriceData, function(d) { return d.x });

                                getAllReserveBidPrices(currentPeriod, periodDelta).catch(function(err) {
                                    cb(new Error('unable to fetch reserve bid prices for interval ' + currentPeriod + ' and ' + currentPeriod + periodDelta - 1));
                                }).then(function(data) {
                                    _.each(data, function(d) {
                                        addReserveOrderBidPriceTable(d.period, d.price);
                                    });
                                    reserveBidPriceData = _.map(data, function(d) { return { x: d.period, y: d.price }});
                                    reserveBidPriceData = _.sortBy(reserveBidPriceData, function(d) { return d.x });  

                                    cb();
                                })
                            }) 
                        }) 
                    })   
                })  
            })
        })
    })
}

function initUI() {
	$("#orderAskTableClear").click(function() {
		clearOrderAskTable();
	});
	$("#orderBidTableClear").click(function() {
		clearOrderBidTable();
	});
	$("#reserveOrderAskTableClear").click(function() {
		clearReserveOrderAskTable();
	});
	$("#reserveOrderBidTableClear").click(function() {
		clearReserveOrderBidTable();
	});
	$("#matchingPriceTableClear").click(function() {
		$('#matchingPriceTable tbody').empty();
	});
	$("#reserveOrderAskPriceTableClear").click(function() {
		$('#reserveOrderAskPriceTable tbody').empty();
	});
	$("#reserveOrderBidPriceTableClear").click(function() {
		$('#reserveOrderBidPriceTable tbody').empty();
	});
	$("#loggingTableClear").click(function() {
		$('#loggingTable tbody').empty();
	});

    var orderChartCtx = $("#orderChart");
    orderChart = new Chart(orderChartCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Ask Order',
                data: orderAskData,
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.2)'
            }, {
                label: 'Bid Order',
                data: orderBidData,
                borderColor: 'rgba(153, 192, 192, 1)',
                backgroundColor: 'rgba(153, 192, 192, 0.2)'
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    }
                }]
            }
        }
    });

    var reserveOrderChartCtx = $("#reserveOrderChart");
    reserveOrderChart = new Chart(reserveOrderChartCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Reserve Ask Order',
                data: reserveOrderAskData,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }, {
                label: 'Reserve Bid Order',
                data: reserveOrderBidData,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)'
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    }
                }]
            }
        }
    });

    var priceChartCtx = $("#priceChart");
    priceChart = new Chart(priceChartCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Matching Price',
                data: matchingPriceData,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
            }, {
                label: 'Reserve Order Ask Price',
                data: reserveAskPriceData,
                borderColor: 'rgba(54, 162, 235, 1)',
                fill: false
            }, {
                label: 'Reserve Order Bid Price',
                data: reserveBidPriceData,
                borderColor: 'rgba(255, 206, 86, 1)',
                fill: false
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        min: currentPeriod ? currentPeriod-periodDelta+1 : 0,
                        max: currentPeriod ? currentPeriod : periodDelta,
                        stepSize: 1
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        stepSize: 10
                    }
                }]
            }
        }
    });

    var settlementsChartCtx = $("#settlementsChart");
    settlementsChart = new Chart(settlementsChartCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Consumer Orderd Volume',
                data: consumerOrderdVolumeData,
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false,
            }, {
                label: 'Consumer Actual Volume',
                data: consumerActualVolumeData,
                borderColor: 'rgba(54, 58, 245, 1)',
                fill: false
            }, {
                label: 'Producer Ordered Volume',
                data: producerOrderdVolumeData,
                borderColor: 'rgba(255, 159, 64, 1)',
                fill: false
            }, {
                label: 'Producer Actual Volume',
                data: producerActualVolumeData,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        min: 0,
                        max: 20,
                        stepSize: 1
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 1000,
                        stepSize: 100
                    }
                }]
            }
        }
    });

    var collateralChartCtx = $("#collateralChart");
    collateralChart = new Chart(collateralChartCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Consumer Previous Collateral',
                data: consumerPreviousCollateralData,
                borderColor: 'rgba(123, 234, 43, 1)',
                fill: false,
            }, {
                label: 'Consumer Actual Collateral',
                data: consumerActualCollateralData,
                borderColor: 'rgba(180, 123, 45, 1)',
                fill: false
            }, {
                label: 'Producer Previous Collateral',
                data: producerPreviousCollateralData,
                borderColor: 'rgba(53, 45, 211, 1)',
                fill: false
            }, {
                label: 'Producer Actual Collateral',
                data: producerActualCollateralData,
                borderColor: 'rgba(223, 62, 20, 1)',
                fill: false
            }]
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        min: 0,
                        max: numCollaterals-1,
                        stepSize: 1
                    }
                }],
                yAxes: [{
                    ticks: {
                        min: -10000000,
                        max: 10000000,
                        stepSize: 1000000
                    }
                }]
            }
        }
    });
}

function subscribeEvents() {

	var socket = io('http://dexapi.westeurope.cloudapp.azure.com:8080');

    socket.on('blockCreationEvent', function(_msg) {
        let time = new Date();
        let msg = JSON.parse(_msg);
        console.log("Block creation event received:", msg);
        console.log('blockCreationEvent ' + time.getHours() + ":" + time.getMinutes(), "#Mined Blocks in current Period: " + msg.MinedBlocksInCurrPeriod);
    
        addLoggingEvent('n/a', 'Block Creation', '#Mined Blocks: ' + msg.MinedBlocksInCurrPeriod);
    });

    socket.on('matchingEvent', function(_msg) {
        let time = new Date();
        let msg = JSON.parse(_msg);
        console.log("matchingEvent received:", msg);
        let price = msg.price;
        let period = msg.period;
        console.log('matchingEvent ' + price + ' ' + period);

        if (_.isUndefined(currentState) || _.isUndefined(currentPeriod)) {
            console.log('currentState or currentPeriod undefined')
            return;
        }

       	if (_.isUndefined(period) || _.isUndefined(price)) {
	    	console.log('incoming period or price of event undefined')
        	return;
        }

        if (currentPeriod !== period) {
            console.log('matchingEvent: currentPeriod !== period')
            return;
        }

		// set current state
        currentState = 1;

        // add and update price chart
        matchingPriceData.push({ x: period, y: price });
        priceChart.data.datasets[0].data = matchingPriceData;
        priceChart.update();

        // add to table
        addMatchingPriceTable(currentPeriod, price);

        showAlert('Reserve Order Submission Phase (Period: ' + currentPeriod + ')');

        // log
        addLoggingEvent(currentPeriod, 'Matching (0 => 1)', 'Price: ' + price);
    });

    socket.on('newPeriodEvent', function(_msg) {
        let msg = JSON.parse(_msg);
        let period =  msg.period;
        let time = new Date();
        console.log('newPeriodEvent received');
        console.log('newPeriodEvent ' + period);

        if (_.isUndefined(currentState) || _.isUndefined(currentPeriod)) {
            console.log('currentState or currentPeriod undefined')
            return;
        }

        if (_.isUndefined(period)) {
            console.log('incoming period of event undefined')
            return;
        }

        if (currentPeriod >= period) {
            console.log('newPeriodEvent: currentPeriod >= period')
            return;
        }

        // set current period and state
        currentPeriod = period;
        currentState = 0;

        // clear order tables
        orderAskData = [];
        orderBidData = [];
        reserveOrderAskData = [];
        reserveOrderBidData = [];
        orderChart.data.datasets[0].data = orderAskData;
        orderChart.data.datasets[1].data = orderBidData;
        reserveOrderChart.data.datasets[0].data = reserveOrderAskData;
        reserveOrderChart.data.datasets[1].data = reserveOrderBidData;
        orderChart.update();
        reserveOrderChart.update();

        // clear settlement table
        consumerOrderdVolumeData = [];
        consumerActualVolumeData = [];
        producerOrderdVolumeData = [];
        producerActualVolumeData = [];
        settlementsChart.data.datasets[0].data = consumerOrderdVolumeData;
        settlementsChart.data.datasets[1].data = consumerActualVolumeData;
        settlementsChart.data.datasets[2].data = producerOrderdVolumeData;
        settlementsChart.data.datasets[3].data = producerActualVolumeData;
        settlementsChart.update();

        // clear old periods in price table
        _.filter(matchingPriceData, function(d) { return _.isUndefined(currentPeriod) || d.period > currentPeriod - periodDelta; }); 
        _.filter(reserveAskPriceData, function(d) { return _.isUndefined(currentPeriod) || d.period > currentPeriod - periodDelta; }); 
        _.filter(reserveAskPriceData, function(d) { return _.isUndefined(currentPeriod) || d.period > currentPeriod - periodDelta; }); 
        priceChart.data.datasets[0].data = matchingPriceData;
        priceChart.data.datasets[1].data = reserveAskPriceData;
        priceChart.data.datasets[2].data = reserveBidPriceData;
        priceChart.options.scales.xAxes[0].ticks.min = Math.max(currentPeriod-periodDelta+1, 0);
        priceChart.options.scales.xAxes[0].ticks.max = Math.max(currentPeriod, periodDelta);
        priceChart.update();

        showAlert('Order Submission Phase (Period: ' + currentPeriod + ')');

        // log
        addLoggingEvent(currentPeriod, 'New Period (1 => 0)', 'n/a');
    });

    socket.on('reservePriceEvent', function(_msg) {
        let time = new Date();
        let msg = JSON.parse(_msg);
        console.log("reservePriceEvent received:", msg);
        let price = msg.price;
        let period = msg.period;
        let type = msg.type;
        console.log('reservePriceEvent ' + price + ' ' + period);

        if (_.isUndefined(currentState) || _.isUndefined(currentPeriod)) {
            console.log('currentState or currentPeriod undefined')
            return;
        }

       	if (_.isUndefined(period) || _.isUndefined(price) || _.isUndefined(type)) {
	    	console.log('incoming period, price or type of event undefined')
        	return;
        }

        if (currentPeriod !== period) {
        	console.log('currentPeriod and incoming period of event do not match');
        	return;
        }

        // todo: Bid hier kleingeschrieben, sonst groß
        if (type === 'Ask') {
			addReserveOrderAskPriceTable(period, price);

            // add and update price chart
            reserveAskPriceData.push({ x: period, y: price });
            priceChart.data.datasets[1].data = reserveAskPriceData;

			addLoggingEvent(currentPeriod, 'Reserve Price (ASK)', 'Price: ' + price);
        } else if (type === 'Bid') {
			addReserveOrderBidPriceTable(period, price);

            // add and update price chart
            reserveBidPriceData.push({ x: period, y: price });
            priceChart.data.datasets[2].data = reserveBidPriceData;

			addLoggingEvent(currentPeriod, 'Reserve Price (BID)', 'Price: ' + price);
        }

        priceChart.update();
    });

    socket.on('orderEvent', function(_msg) {
        let time = new Date();
        let msg = JSON.parse(_msg);
        console.log("orderEvent received", msg);
        let price = msg.price;
        let period = msg.period;
        let type = msg.type;
        let volume = msg.volume;

	    if (_.isUndefined(currentState) || _.isUndefined(currentPeriod)) {
	    	console.log('currentState or currentPeriod undefined')
        	return;
        }

       	if (_.isUndefined(price) || _.isUndefined(period) || _.isUndefined(type)) {
	    	console.log('incoming price, period or type of event undefined')
        	return;
        }

        if (currentPeriod !== period) {
        	console.log('currentPeriod and incoming period of event do not match');
        	return;
        }

        if (type === 'ASK') {
        	if (currentState === 0) {
				addOrderAskTable(currentPeriod, price, volume);

                // add and update order chart
                orderAskData.push({ x: price, y: volume });
                orderAskData = _.sortBy(orderAskData, function(d) { return d.x });
                orderAskData = _.reverse(orderAskData);
                orderChart.data.datasets[0].data = orderAskData;
                orderChart.update();

				addLoggingEvent(currentPeriod, 'Order (ASK)', 'Price: ' + price + ' Volume: ' + volume);
        	} else {
				addReserveOrderAskTable(currentPeriod, price, volume);	

                // add and update reserve order chart
                reserveOrderAskData.push({ x: price, y: volume });
                reserveOrderAskData = _.sortBy(reserveOrderAskData, function(d) { return d.x });
                reserveOrderAskData = _.reverse(reserveOrderAskData);
                reserveOrderChart.data.datasets[0].data = reserveOrderAskData;
                reserveOrderChart.update();

        		addLoggingEvent(currentPeriod, 'Reserve Order (ASK)', 'Price: ' + price + ' Volume: ' + volume);
        	}
        } else if (type === 'BID') {
        	if (currentState === 0) {
				addOrderBidTable(currentPeriod, price, volume);

                // add and update order chart
                orderBidData.push({ x: price, y: volume });
                orderBidData = _.sortBy(orderBidData, function(d) { return d.x });
                orderChart.data.datasets[1].data = orderBidData;
                orderChart.update();

				addLoggingEvent(currentPeriod, 'Order (BID)', 'Price: ' + price + ' Volume: ' + volume);
			} else {
				addReserveOrderBidTable(currentPeriod, price, volume);

                reserveOrderBidData.push({ x: price, y: volume });
                reserveOrderBidData = _.sortBy(reserveOrderBidData, function(d) { return d.x });
                reserveOrderChart.data.datasets[1].data = reserveOrderBidData;
                reserveOrderChart.update();

				addLoggingEvent(currentPeriod, 'Reserve Order (BID)', 'Price: ' + price + ' Volume: ' + volume);
			}
        }
    });

    socket.on('SettleEvent', function(_msg) {
        let time = new Date();
        let msg = JSON.parse(_msg);
        console.log("SettleEvent received:", msg);
        let orderedVolume = msg.orderedVolume;
        let usedVolume = msg.usedVolume;
        let period = msg.period;
        let type = msg.type;
        let user = msg.user;
        console.log('SettleEvent ' + user + ' ' + orderedVolume + ' ' + usedVolume);

        if (_.isUndefined(currentState) || _.isUndefined(currentPeriod)) {
            console.log('currentState or currentPeriod undefined')
            return;
        }

        if (_.isUndefined(orderedVolume) || _.isUndefined(usedVolume) || _.isUndefined(period) || _.isUndefined(type) || _.isUndefined(user)) {
            console.log('incoming period, orderedVolume, usedVolume, user or type of event undefined')
            return;
        }

        if (currentPeriod !== period) {
            console.log('currentPeriod and incoming period of event do not match');
            return;
        }

        // todo: Bid hier kleingeschrieben, sonst groß
        if (type === 'producer') {
            addSettlementProducerTable(period, user.substring(0, 10) + '...', orderedVolume, usedVolume);

            userAddressesProducerData.push(user);
            var userId = userAddressesProducerData.findIndex(function(e) { return e === user; });

            // add and update price chart
            producerOrderdVolumeData.push({ x: userId, y: orderedVolume });
            producerActualVolumeData.push({ x: userId, y: usedVolume });
            producerOrderdVolumeData = _.sortBy(producerOrderdVolumeData, function(d) { return d.x });
            producerActualVolumeData = _.sortBy(producerActualVolumeData, function(d) { return d.x });
            settlementsChart.data.datasets[2].data = producerOrderdVolumeData;
            settlementsChart.data.datasets[3].data = producerActualVolumeData;

            addLoggingEvent(currentPeriod, 'Settlement Producer', 'Ordered Volume: ' + orderedVolume + ' Actual Volume: ' + usedVolume);

        } else if (type === 'consumer') {
            addSettlementConsumerTable(period, user.substring(0, 10) + '...', orderedVolume, usedVolume);

            userAddressesConsumerData.push(user);
            var userId = userAddressesConsumerData.findIndex(function(e) { return e === user; });

            // add and update price chart
            consumerOrderdVolumeData.push({ x: userId, y: orderedVolume });
            consumerActualVolumeData.push({ x: userId, y: usedVolume });
            consumerOrderdVolumeData = _.sortBy(consumerOrderdVolumeData, function(d) { return d.x });
            consumerActualVolumeData = _.sortBy(consumerActualVolumeData, function(d) { return d.x });
            settlementsChart.data.datasets[0].data = consumerOrderdVolumeData;
            settlementsChart.data.datasets[1].data = consumerActualVolumeData;

            addLoggingEvent(currentPeriod, 'Settlement Consumer', 'Ordered Volume: ' + orderedVolume + ' Actual Volume: ' + usedVolume);
        }

        settlementsChart.update();
    });

    socket.on('EndSettleEvent', function(_msg) {
        let time = new Date();
        let msg = JSON.parse(_msg);
        console.log("EndSettleEvent received:", msg);
        let period = msg.period;
        console.log('EndSettleEvent ' + period);

        if (_.isUndefined(currentState) || _.isUndefined(currentPeriod)) {
            console.log('currentState or currentPeriod undefined')
            return;
        }

        if (_.isUndefined(period)) {
            console.log('incoming period of event undefined')
            return;
        }

        if (currentPeriod-1 !== period) {
            console.log('currentPeriod and incoming period-1 of event do not match');
            return;
        }

        // clear collateral
        consumerPreviousCollateralData = [];
        consumerActualCollateralData = [];
        producerPreviousCollateralData = [];
        producerActualCollateralData = [];
        collateralChart.data.datasets[0].data = consumerPreviousCollateralData;
        collateralChart.data.datasets[1].data = consumerActualCollateralData;
        collateralChart.data.datasets[2].data = producerPreviousCollateralData;
        collateralChart.data.datasets[3].data = producerActualCollateralData;
        collateralChart.update();

        fetchProducerCollaterals(function(producerCollaterals) {
            // get collateral producer
            for (var i=0;i<producerCollaterals.length;i++) {
                var c = producerCollaterals[i];
                addCollateralProducerTable(period, c.userAdress.substring(0, 10) + '...', 'n/a', c.collateral);
                var userId = userAddressesProducerData.findIndex(function(e) { return e === c.userAdress; });

                // add and update price chart
                producerActualCollateralData.push({ x: userId, y: c.collateral });
                producerActualCollateralData = _.sortBy(producerActualCollateralData, function(d) { return d.x });
                collateralChart.data.datasets[3].data = producerActualCollateralData;
            }

            collateralChart.update();
            userAddressesProducerData = [];
        });

        fetchConsumerCollaterals(function(consumerCollaterals) {
            // get collateral consumer
            for (var i=0;i<consumerCollaterals.length;i++) {
                var c = consumerCollaterals[i];
                addCollateralConsumerTable(period, c.userAdress.substring(0, 10) + '...', 'n/a', c.collateral);

                var userId = userAddressesConsumerData.findIndex(function(e) { return e === c.userAdress; });

                // add and update price chart
                consumerActualCollateralData.push({ x: userId, y: c.collateral });
                consumerActualCollateralData = _.sortBy(consumerActualCollateralData, function(d) { return d.x });
                collateralChart.data.datasets[1].data = consumerActualCollateralData;
            }

            collateralChart.update();
            userAddressesConsumerData = [];
        });
    });
}

function addLoggingEvent(period, eventName, data) {
	if (!_.isUndefined(period) && !_.isUndefined(eventName) && !_.isUndefined(data)) {
		var className = 'info';
		if (eventName === 'Matching (0 => 1)') {
			className = 'warning';
		} else if (eventName === 'New Period (1 => 0)') {
			className = 'success';
		}
		$('#loggingTable tbody').prepend('<tr class=' + className + '><td class="col-md-4">' + period + '</td><td class="col-md-4">' + eventName + '</td><td class="col-md-4">' + data + '</td></tr>');
	}
}

function addOrderBidTable(period, price, volume) {
	if (!_.isUndefined(period) && !_.isUndefined(price) && !_.isUndefined(volume)) {
		$('<tr><td>' + period + '</td><td>' + price + '</td><td>' + volume + '</td></tr>').prependTo('#orderBidTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addOrderAskTable(period, price, volume) {
	if (!_.isUndefined(period) && !_.isUndefined(price) && !_.isUndefined(volume)) {
        $('<tr><td>' + period + '</td><td>' + price + '</td><td>' + volume + '</td></tr>').prependTo('#orderAskTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addReserveOrderBidTable(period, price, volume) {
	if (!_.isUndefined(period) && !_.isUndefined(price) && !_.isUndefined(volume)) {
        $('<tr><td>' + period + '</td><td>' + price + '</td><td>' + volume + '</td></tr>').prependTo('#reserveOrderBidTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addReserveOrderAskTable(period, price, volume) {
	if (!_.isUndefined(period) && !_.isUndefined(price) && !_.isUndefined(volume)) {
        $('<tr><td>' + period + '</td><td>' + price + '</td><td>' + volume + '</td></tr>').prependTo('#reserveOrderAskTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addMatchingPriceTable(period, price) {
	if (!_.isUndefined(period) && !_.isUndefined(price)) {
        $('<tr><td>' + period + '</td><td>' + price + '</td></tr>').prependTo('#matchingPriceTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addReserveOrderAskPriceTable(period, price) {
	if (!_.isUndefined(period) && !_.isUndefined(price)) {
        $('<tr><td>' + period + '</td><td>' + price + '</td></tr>').prependTo('#reserveOrderAskPriceTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addReserveOrderBidPriceTable(period, price) {
	if (!_.isUndefined(period) && !_.isUndefined(price)) {
        $('<tr><td>' + period + '</td><td>' + price + '</td></tr>').prependTo('#reserveOrderBidPriceTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
	}
}

function addSettlementProducerTable(period, user, orderedVolume, usedVolume) {
    if (!_.isUndefined(period) && !_.isUndefined(user) && !_.isUndefined(orderedVolume) && !_.isUndefined(usedVolume)) {
        $('<tr><td>' + period + '</td><td>' + user + '</td><td>' + orderedVolume + '</td><td>' + usedVolume + '</td></tr>').prependTo('#settlementsProducerTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
    } 
}

function addSettlementConsumerTable(period, user, orderedVolume, usedVolume) {
    if (!_.isUndefined(period) && !_.isUndefined(user) && !_.isUndefined(orderedVolume) && !_.isUndefined(usedVolume)) {
        $('<tr><td>' + period + '</td><td>' + user + '</td><td>' + orderedVolume + '</td><td>' + usedVolume + '</td></tr>').prependTo('#settlementsConsumerTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
    } 
}

function addCollateralProducerTable(period, user, previousCollateral, actualCollateral) {
    if (!_.isUndefined(period) && !_.isUndefined(user) && !_.isUndefined(previousCollateral) && !_.isUndefined(actualCollateral)) {
        $('<tr><td>' + period + '</td><td>' + user + '</td><td>' + previousCollateral + '</td><td>' + actualCollateral + '</td></tr>').prependTo('#collateralProducerTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
    } 
}

function addCollateralConsumerTable(period, user, previousCollateral, actualCollateral) {
    if (!_.isUndefined(period) && !_.isUndefined(user) && !_.isUndefined(previousCollateral) && !_.isUndefined(actualCollateral)) {
        $('<tr><td>' + period + '</td><td>' + user + '</td><td>' + previousCollateral + '</td><td>' + actualCollateral + '</td></tr>').prependTo('#collateralConsumerTable tbody').effect('highlight', {color: '#ffffcc'}, 2000);
    } 
}

function clearOrderBidTable() {
	$('#orderBidTable tbody').empty();
}

function clearOrderAskTable() {
	$('#orderAskTable tbody').empty();
}

function clearReserveOrderBidTable() {
	$('#reserveOrderBidTable tbody').empty();
}

function clearReserveOrderAskTable() {
	$('#reserveOrderAskTable tbody').empty();
}

function showAlert(text) {
	if (_.isUndefined(text)) {
		text = '';
	}
	$('#alert').text(text).effect('highlight', {color: '#ffffcc'}, 2000);
}

$(document).ready(function() { 
    requestData(function(err) {
        if (err) {
            alert(err.message);
            return;
        }
        if (currentState === 0) {
            showAlert('Order Submission Phase (Period: ' + currentPeriod + ')');
        } else if (currentState === 1) {
            showAlert('Reserve Order Submission Phase (Period: ' + currentPeriod + ')');
        }

        // log
        addLoggingEvent('n/a', 'Dashboard initialized', 'n/a');

        initUI();
        subscribeEvents();
    });  
});
