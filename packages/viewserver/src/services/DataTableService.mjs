import Table from './Table.mjs';
import Subscription from './Subscription.mjs';
import { uuid } from '@heswell/server-core';

const _tables = {};
var _subscriptions = {};
var _client_subscriptions = {};
const _queued_subscriptions = {};

// TODO unify these with DataTypes
const DataType = {
  Rowset: 'rowset',
  Update: 'update',
  Snapshot: 'snapshot',
  FilterData: 'filterData',
  SearchData: 'searchData',
  Selected: 'selected'
};

// need an API call to expose tables so extension services can manipulate data

export const configure = ({ DataTables }) =>
  Promise.all(DataTables.map(async (config) => await createTable(config)));

async function createTable({ dataPath, ...config }) {
  const { name: tablename } = config;
  const table = (_tables[tablename] = new Table(config));

  if (dataPath) {
    await table.loadData(dataPath);
  }

  const qs = _queued_subscriptions[tablename];
  if (qs) {
    console.log(`Table ${tablename} created and we have queued Subscription(s)}`);
    _queued_subscriptions[tablename] = undefined;
    qs.forEach(({ clientId, request, queue }) => {
      console.log(`Add Queued Subscription clientId:${clientId}`);
      AddSubscription(clientId, request, queue);
    });
  }

  return table;
}

export function GET_TABLE_LIST(sessionId, requestId, request, queue) {
  const tables = getTableNames();
  console.log(`received GET_TABLE_LIST request, requestId ${requestId} tables are ${tables}`);

  queue.push({
    requestId,
    sessionId,
    token: 'poo',
    user: 'user',
    priority: 1,
    body: {
      requestId,
      type: 'TABLE_LIST_RESP',
      tables: tables.map(table => ({table, module: 'SIMUL'}))
    }
  });

}

export function GET_TABLE_META(sessionId, requestId, request, queue) {

  const table =  getTable(request.table.table);

  queue.push({
    requestId,
    sessionId,
    token: 'poo',
    user: 'user',
    priority: 1,
    body: {
      requestId,
      type: 'TABLE_META_RESP',
      columns: table.columns.map(col => col.name),
      dataTypes: table.columns.map(col => col.type?.name ?? col.type ?? "string"),
      table: request.table
    }
  });

}

export function CREATE_VP(sessionId, requestId, request, queue) {
  const { table: {table: tableName} } = request;
  const table = _tables[tableName];
  if (table.status === 'ready') {
    const viewportId = uuid();
    console.log(`subscribe to ${tableName}, table is ready ${JSON.stringify(request)}, viewport id will be ${viewportId}`)
    _subscriptions[viewportId] = Subscription(table, viewportId, request, queue);
    let clientSubscriptions =
      _client_subscriptions[sessionId] || (_client_subscriptions[sessionId] = []);
    clientSubscriptions.push(request.viewport);
  } else {
    const qs = _queued_subscriptions;
    const q = qs[tablename] || (qs[tablename] = []);
    q.push({ sessionId, request, queue });
    console.log(`queued subscriptions for ${tablename} = ${q.length}`);
  }
}

export function unsubscribeAll(clientId, queue) {
  const subscriptions = _client_subscriptions[clientId];
  if (subscriptions && subscriptions.length) {
    subscriptions.forEach((viewport) => {
      const subscription = _subscriptions[viewport];
      subscription.cancel();
      delete _subscriptions[viewport];
      queue.purgeViewport(viewport);
    });
    delete _client_subscriptions[clientId];
  }
}

export function TerminateSubscription(clientId, request, queue) {
  const { viewport } = request;
  _subscriptions[viewport].cancel();
  delete _subscriptions[viewport];
  // purge any messages for this viewport from the messageQueue
  _client_subscriptions[clientId] = _client_subscriptions[clientId].filter((vp) => vp !== viewport);
  if (_client_subscriptions[clientId].length === 0) {
    delete _client_subscriptions[clientId];
  }
  queue.purgeViewport(viewport);
}

// SuspendSubscription
// ResumeSUbscription
// TerminateAllSubscriptionsForClient

export function ModifySubscription(clientId, request, queue) {
  _subscriptions[request.viewport].update(request, queue);
}

export function ExpandGroup(clientId, request, queue) {
  _subscriptions[request.viewport].update(request, queue);
}

export function CollapseGroup(clientId, request, queue) {
  _subscriptions[request.viewport].update(request, queue);
}

export function GetTableMeta(clientId, request, queue) {
  const { requestId } = request;
  const table = getTable(request.table);

  queue.push({
    priority: 1,
    requestId,
    type: 'column-list',
    table: table.name,
    key: 'Symbol',
    columns: table.columns
  });
}

export function setViewRange(clientId, request, queue) {
  const { viewport, range, useDelta = true, dataType } = request;
  //TODO this can be standardised
  const type =
    dataType === 'rowData'
      ? DataType.Rowset
      : dataType === 'filterData'
      ? DataType.FilterData
      : dataType === 'searchData'
      ? DataType.SearchData
      : null;
  // should be purge the queue of any pending updates outside the requested range ?

  const now = new Date().getTime();
  console.log(' ');
  console.log(`[${now}] DataTableService: setRange ${range.lo} - ${range.hi}`);

  _subscriptions[viewport].invoke('setRange', queue, type, range, useDelta, dataType);
}

export function sort(clientId, { viewport, sortCriteria }, queue) {
  _subscriptions[viewport].invoke('sort', queue, DataType.Snapshot, sortCriteria);
}

export function filter(clientId, { viewport, filter, incremental, dataType }, queue) {
  _subscriptions[viewport].invoke('filter', queue, dataType, filter, dataType, incremental);
}

export function select(
  clientId,
  { viewport, idx, rangeSelect, keepExistingSelection, dataType },
  queue
) {
  _subscriptions[viewport].invoke(
    'select',
    queue,
    DataType.Selected,
    idx,
    rangeSelect,
    keepExistingSelection,
    dataType
  );
}

export function selectAll(clientId, { viewport, dataType }, queue) {
  _subscriptions[viewport].invoke('selectAll', queue, DataType.Selected, dataType);
}

export function selectNone(clientId, { viewport, dataType }, queue) {
  _subscriptions[viewport].invoke('selectNone', queue, DataType.Selected, dataType);
}

export function groupBy(clientId, { viewport, groupBy }, queue) {
  _subscriptions[viewport].invoke('groupBy', queue, DataType.Snapshot, groupBy);
}

export function setGroupState(clientId, { viewport, groupState }, queue) {
  _subscriptions[viewport].invoke('setGroupState', queue, DataType.Rowset, groupState);
}

export function GetFilterData(clientId, { viewport, column, searchText, range }, queue) {
  // TODO what about range ?
  _subscriptions[viewport].invoke(
    'getFilterData',
    queue,
    DataType.FilterData,
    column,
    searchText,
    range
  );
}

export function InsertTableRow(clientId, request, queue) {
  const tableHelper = getTable(request.tablename);
  tableHelper.table.insert(request.row);
  console.warn(`InsertTableRow TODO send confirmation ${queue.length}`);
}

function getTable(name) {
  if (_tables[name]) {
    return _tables[name];
  } else {
    throw Error(`DataTableService. no table definition for ${name}`);
  }
}

function getTableNames() {
  return Object.keys(_tables);
}
