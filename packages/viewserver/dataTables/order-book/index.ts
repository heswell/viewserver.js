import fs from 'fs';
import { pathToFileURL } from 'url';

const data_path = fs.realpathSync(process.cwd());
const project_path = 'src/@heswell/viewserver/dist/dataTables/order-book';

const config = {
  name: 'order-book',
  dataPath: pathToFileURL(`${data_path}/${project_path}/dataset.js`),
  // createPath: pathToFileURL(`${data_path}/${project_path}/create-row`,
  // updatePath: pathToFileURL(`${data_path}/${project_path}/update-row`,
  type: 'vs',
  primaryKey: 'Id',
  columns: [
    { name: 'Id' },
    { name: 'ISIN' },
    { name: 'Level' },
    { name: 'Bid' },
    { name: 'Bid Volume' },
    { name: 'Bid Party' },
    { name: 'Ask' },
    { name: 'Ask Volume' },
    { name: 'Ask Party' },
    { name: 'timestamp' }
  ]
  // updates: {
  //     interval: 100,
  //     fields: ['Price'],
  //     applyInserts: false,
  //     applyUpdates: false
  // }
};

export default config;
