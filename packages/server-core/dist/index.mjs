'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

function _interopNamespace(e) {
    if (e && e.__esModule) { return e; } else {
        var n = {};
        if (e) {
            Object.keys(e).forEach(function (k) {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () {
                        return e[k];
                    }
                });
            });
        }
        n['default'] = e;
        return n;
    }
}

require('crypto');
var http = _interopDefault(require('http'));

/* global require:false */

const services = {};
const serviceAPI = {};

function configure(config){

    console.log(`requestHandler.configure ${JSON.stringify(config,null,2)}`);

    config.services.forEach(async ({name, module, API}) => {
        console.log(`about to import ${module}`);
        const service = await new Promise(function (resolve) { resolve(_interopNamespace(require(module))); });
        services[name] = service;
        API.forEach(messageType => serviceAPI[messageType] = name);
        console.log(`configure service ${name} `);
        service.configure(config);
    });

}

function findHandler(type){
    const serviceName = serviceAPI[type];
    if (serviceName){
        return services[serviceName][type];
    }
}

function killSubscriptions(clientId, queue){
    Object.keys(services).forEach(name => {
        const killSubscription = services[name]['unsubscribeAll'];
        if (killSubscription){
            killSubscription(clientId, queue);
        }
    });

}

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function bisector(compare) {
  if (compare.length === 1) compare = ascendingComparator(compare);
  return {
    left: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    right: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }
  };
}

function ascendingComparator(f) {
  return function(d, x) {
    return ascending(f(d), x);
  };
}

var ascendingBisect = bisector(ascending);

const SET_FILTER_DATA_COLUMNS = [
    {name: 'name'}, 
    {name: 'count', width: 40}, 
    {name: 'totalCount', width: 40}
];

const BIN_FILTER_DATA_COLUMNS = [
    {name: 'bin'}, 
    {name: 'count'}, 
    {name: 'bin-lo'},
    {name: 'bin-hi'}
];

const setFilterColumnMeta = metaData(SET_FILTER_DATA_COLUMNS);
const binFilterColumnMeta = metaData(BIN_FILTER_DATA_COLUMNS);

//TODO cache result by length
function metaData(columns){
    const start = Math.max(...columns.map((column, idx) => typeof column.key === 'number' ? column.key : idx));
    return {
        IDX: start + 1,
        RENDER_IDX: start + 2,
        DEPTH: start + 3,
        COUNT: start + 4,
        KEY: start + 5,
        SELECTED: start + 6,
        PARENT_IDX: start + 7,
        IDX_POINTER: start + 8,
        FILTER_COUNT: start + 9,
        NEXT_FILTER_IDX: start + 10,
        count: start + 11
    }
}

const DataTypes = {
    ROW_DATA: 'rowData',
    FILTER_DATA: 'filterData',
    FILTER_BINS: 'filterBins'
};

function resetRange({lo,hi,bufferSize=0}){
    return {
        lo: 0,
        hi: hi-lo,
        bufferSize,
        reset: true
    };
}

function getFullRange({lo,hi,bufferSize=0}){
    return {
        lo: Math.max(0, lo - bufferSize),
        hi: hi + bufferSize
    };
}

const rangeUtils = {
  getFullRange,
  resetRange
};

const DataTypes$1 = DataTypes;

const EMPTY_ARRAY = [];
const ROWSET = 'rowset';
const UPDATE = 'update';
const FILTER_DATA = 'filterData';

class MessageQueue {

    constructor() {
        this._queue = [];
    }

    get length() { return this._queue.length; }
    set length(val) { this._queue.length = val; }
    get queue() {
        const q = this._queue.slice();
        this._queue.length = 0;
        return q;
    }

    push(message, meta) {
        const { type, data } = message;
        if (type === UPDATE) {
            mergeAndPurgeUpdates(this._queue, message);
        } else if (type === ROWSET) {
            if (message.data.rows.length === 0 && message.size > 0) {
                return;
            }
            mergeAndPurgeRowset(this._queue, message, meta);

        } else if (type === FILTER_DATA && data.type !== DataTypes$1.FILTER_BINS) {
            mergeAndPurgeFilterData(this._queue, message, meta);
        }
        if (message.type === 'rowset'){
            console.log(`[${Date.now()}] message queue push message ${JSON.stringify(message.data.range)}`);
        }
        this._queue.push(message);

    }

    purgeViewport(viewport) {
        this._queue = this._queue.filter(batch => batch.viewport !== viewport);
    }

    // currentRange(){
    //     for (let i = 0; i<this._queue.length; i++){
    //         const message = this._queue[i];
    //         const {data} = message;
    //         if (data){
    //             console.log(`message-queue.currentRange ${message.type} ${JSON.stringify(data.range)}`)
    //         }
    //     }
    // }

    extract(test) {
        if (this._queue.length === 0) {
            return EMPTY_ARRAY;
        } else {
            return extractMessages(this._queue, test);
        }
    }
}


// This purges redundant messages from the queue and merges their data into the new message. 
// AN unintended consequence of this might be that data slips down the queue, as the new 
// message is added at the back of the queue - INVESTIGATE.
function mergeAndPurgeFilterData(queue, message, meta) {
    const {IDX} = meta;
    const { viewport, data: filterData } = message;
    const { range } = filterData;
    const { lo, hi } = rangeUtils.getFullRange(range);

    for (var i = queue.length - 1; i >= 0; i--) {

        let { type, viewport: vp, data } = queue[i];

        if (vp === viewport && type === FILTER_DATA) {

            var { lo: lo1, hi: hi1 } = rangeUtils.getFullRange(queue[i].data.range);

            /*if ((lo1 === 0 && hi1 === 0 && lo === 0) ||
                (lo1 >= hi || hi1 < lo)) {
                    // nothing to do
                }
            else {
*/
                var overlaps = data.rows.filter(
                    row => row[IDX] >= lo && row[IDX] < hi);


                if (lo < lo1) {
                    message.data = {
                        ...message.data,
                        rows: filterData.rows.concat(overlaps)
                    };
                }
                else {
                    message.data = {
                        ...message.data,
                        rows: overlaps.concat(filterData.rows)
                    };
                }

            // }
            queue.splice(i, 1);
        }
    }
}

// we need to know the current range in order to be able to merge rowsets which are still valid
function mergeAndPurgeRowset(queue, message, meta) {
    const { viewport, data: { rows, size, range, offset=0 } } = message;
    const { lo, hi } = rangeUtils.getFullRange(range);
    const low = lo + offset;
    const high = hi + offset;

    if (rows.length === 0){
        console.log(`MESSAGE PUSHED TO MESAGEQ WITH NO ROWS`);
        return;
    }

    const {IDX} = meta;

    for (var i = queue.length - 1; i >= 0; i--) {

        let { type, viewport: vp, data } = queue[i];

        if (vp === viewport) {

            if (type === ROWSET) { // snapshot. filterData, searchData 

                var { range: { lo: lo1, hi: hi1 } } = queue[i].data;

                if (lo1 >= hi || hi1 < lo) ;
                else {
                    var overlaps = data.rows.filter(
                        row => row[IDX] >= low && row[IDX] < high);

                    if (lo < lo1) {
                        message.data.rows = rows.concat(overlaps);
                    }
                    else {
                        message.data.rows = overlaps.concat(rows);
                    }
                }
                queue.splice(i, 1);
            }
            else if (type === UPDATE) {
                // if we have updates for rows within the current rowset, discard them - the rowset
                // represents latest data.
                let validUpdates = queue[i].updates.filter(u => {
                    let idx = u[IDX];

                    if (typeof rows[IDX] === 'undefined') {
                        console.warn(`MessageQueue:about to error, these are the rows that have been passed `);
                        console.warn(`[${rows.map(r => r[IDX]).join(',')}]`);
                    }


                    let min = rows[0][IDX];
                    let max = rows[rows.length - 1][IDX];

                    return idx >= low && idx < high &&   	// within range 
                        idx < size &&  				// within dataset  
                        (idx < min || idx >= max); 		// NOT within new rowset 
                });

                if (validUpdates.length) {
                    queue[i].updates = validUpdates;
                }
                else {
                    //onsole.log(`MessageQueue:purging updates that are no longer applicable`);
                    queue.splice(i, 1);
                }
            }


        }
    }
}

// we need to know the current range in order to be able to merge rowsets which are still valid
function mergeAndPurgeUpdates(queue, message) {

    //onsole.log(`mergeAndPurge: update message ${JSON.stringify(message)}` );

    var { viewport, range: { lo, hi } } = message;

    //onsole.log(`mergeAndPurge: update message ${lo} - ${hi}   ${JSON.stringify(queue)}` );

    for (var i = queue.length - 1; i >= 0; i--) {

        if (queue[i].type === message.type && queue[i].viewport === viewport) {

            //onsole.log(`we have a match for an update ${i} of ${queue.length}   ${JSON.stringify(queue[i].updates)}`)

            var { lo: lo1, hi: hi1 } = queue[i].updates;
            console.log(`merging rowset current range [${lo},${hi}] [${queue[i].rows.lo},${queue[i].rows.hi}]`);
            queue.splice(i, 1);
        }
    }
}

function extractMessages(queue, test) {
    var extract = [];

    for (var i = queue.length - 1; i >= 0; i--) {
        if (test(queue[i])) {
            extract.push(queue.splice(i, 1)[0]);
        }
    }

    extract.reverse();
    const now = new Date().getTime();
    console.log(`[${now}] extracted messages ${extract.map(formatMessage)}\n\n`);
    return extract;
}


const formatMessage = msg => ` type: ${msg.type} 
    rows: [${msg.data && msg.data.rows && msg.data.rows.map(row => row[7])}]`;

function updateLoop(name, connection, interval, fn){
  
      //console.log(`starting update loop ${name} @  ${interval}`);
  
      let _keepGoing = true;
      let _timeoutHandle = null;
  
      function beat(){
  
          const message = fn();
  
          if (message !== null){
              connection.send(message);
          }	
          
          if (_keepGoing){
              _timeoutHandle = setTimeout(beat, interval);
          }
      }
  
      beat();
  
      function stopper(){
          console.log(`stopping updateLoop ${name}`);
          if (_timeoutHandle){
              clearTimeout(_timeoutHandle);
          }
          _keepGoing = false;
      }
  
      return stopper;
  
  
  }

// we can have a separate clientId for XHR requests
let _clientId = 0;

const requestHandler = (options, logger) => (localWebsocketConnection) => {

    const { HEARTBEAT_FREQUENCY, PRIORITY_UPDATE_FREQUENCY, CLIENT_UPDATE_FREQUENCY } = options;

    let server_clientId = ++_clientId;

    console.log(`Server.websocketRequestHandler: connection request from new client #${server_clientId}`);

    localWebsocketConnection.send(JSON.stringify(
        { type: 'Welcome', clientId: ++_clientId }
    ));

    const _update_queue = new MessageQueue();

    // Note: these loops are all running per client, this will get expensive
    const HEARTBEAT = JSON.stringify({ type: 'HB', vsHostName: 'localhost' });
    const stopHeartBeats = updateLoop('HeartBeat', localWebsocketConnection, HEARTBEAT_FREQUENCY, () => HEARTBEAT);
    const stopPriorityUpdates = updateLoop('Priority Updates', localWebsocketConnection, PRIORITY_UPDATE_FREQUENCY, priorityQueueReader);
    const stopUpdates = updateLoop('Regular Updates', localWebsocketConnection, CLIENT_UPDATE_FREQUENCY, queueReader);

    localWebsocketConnection.on('message', function (msg) {

        const json = JSON.parse(msg);
        const message = json.message;
        const msgType = message.type;

        // some handlers are stateful (eg tableHandler). They must be notified 
        // when connection closes (maybe with delay to allow for temp disconenction)
        const handler = findHandler(msgType);

        if (handler) {
            handler(server_clientId, message, _update_queue);
        } else {
            console.log('server: dont know how to handle ' + msg);
        }

    });

    localWebsocketConnection.on('close', function (msg) {

        console.log('>>> viewserver, local CONNECTION closed');

        // how do we clear up the open subscription(s)
        // keep  alist od all active handlers and notify them

        stopHeartBeats();
        stopPriorityUpdates();
        stopUpdates();

        killSubscriptions(server_clientId, _update_queue);
        // kill the update queue

    });

    function PRIORITY1(msg) { return msg.priority === 1 }

    function priorityQueueReader() {
        const queue = _update_queue.extract(PRIORITY1);
        if (queue.length > 0) {
            queue.forEach(msg => {
                if (msg.data && msg.data.range){
                    console.log(`[${Date.now()}]<<<<<<<<< ${msg.type} ${JSON.stringify(msg.data.range)}`);
                }
            });
            const msg = JSON.stringify(queue);
            return msg;
        } else {
            return null;
        }
    }

    function queueReader() {
        if (_update_queue.length > 0) {
            const msg = JSON.stringify(_update_queue.queue);
            //onsole.log(`\n[${new Date().toISOString().slice(11,23)}] <<<<<   ${msg}`);
            return msg;
        } else {
            return null;
        }
    }

};

/* global require:false __dirname:false process:false module:false */

const WebSocket = require('ws');

class SubscriptionCounter {
    constructor(){
        this._count = 0;
    }
    next(){
        this._count += 1;
        return this._count;
    }
}

//const mapArgs = (map, arg) => {let [n,v]=arg.split('=');map[n.toLowerCase()]=v;return map;};
// const args = process.argv.slice(2).reduce(mapArgs,{});
const port = /* argv.port || */ 9090;

//onsole.log(`args ${JSON.stringify(process.argv)}`);

//const port = process.env.OPENSHIFT_NODEJS_PORT || argv.port || 9090;
const PRIORITY_UPDATE_FREQUENCY = 50;
const CLIENT_UPDATE_FREQUENCY = 250;
const HEARTBEAT_FREQUENCY = 5000;

function start(config){

    configure({
        ...config,
        subscriptionCounter: new SubscriptionCounter()
    });

    const msgConfig = {
        CLIENT_UPDATE_FREQUENCY,
        HEARTBEAT_FREQUENCY,
        PRIORITY_UPDATE_FREQUENCY
    };

    const httpServer = http.createServer(function(request, response) {
        
        if (request.url === '/xhr'){
            handleXhrRequest(request);
        } else if (request.url.match(/\/ws\/stomp\/info/)) {
            // doesn't belng here
            const HTTP_HEADERS = {
                'Access-Control-Allow-Credentials': true,
                'Access-Control-Allow-Origin': request.headers['origin'],
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                // 'Content-Length':77,
                'Content-type': 'application/json;charset=UTF-8'
            };
            response.writeHead(200, HTTP_HEADERS);
            response.end(JSON.stringify({entropy: 9006110,origins: ['*:*'],'cookie_needed': true,websocket: true}));

        } else {
            console.log((new Date()) + ' received request for ' + request.url);
            request.addListener('end', function () {
                // do nothing
            }).resume();
        }
    });

    const wss = new WebSocket.Server({server: httpServer});

    // const requestHandler = argv.stomp   
    //     ? stompRequestHandler
    //     : argv.sockjs
    //         ? sockjsRequestHandler
    //         : viewserverRequestHandler;
    const requestHandler$1 = requestHandler;

    wss.on('connection', requestHandler$1(msgConfig));

    // const ipaddress = '127.0.0.1';
    httpServer.listen(port, function() {
        console.log(`HTTP Server is listening on port ${port}`);
    });
}
function handleXhrRequest(request, response){
    let content = '';
    request.on('data', data => content += data);
    request.on('end', () => {
        console.log(`got a client request ${content}`);
        let {clientId,message} = JSON.parse(content);
    });
}

module.exports = start;
//# sourceMappingURL=index.mjs.map