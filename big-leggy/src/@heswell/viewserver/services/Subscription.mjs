import {InMemoryView as View, columnUtils} from '../../data';

//TODO implement as class
export default function Subscription (table, {viewport, requestId, ...options}, queue){

    const tablename = table.name;
    const {range, columns, sortCriteria, groupBy} = options;

    let view = new View(table, {columns, sortCriteria, groupBy});
    let timeoutHandle;

    const meta = columnUtils.metaData(columns);

    console.log(`Subscription ${tablename} ${JSON.stringify(options,null,2)}`)

    queue.push({
        requestId,
        viewport,
        type: 'Subscribed',
        tablename,
        size: view.size,
        offset: view.offset
    });

    if (view.status === 'ready'){
        const data = view.setRange(range);
        if (data.rows.length){
            console.log(`initial set of data returned immediately on Subscription ${JSON.stringify(range)} (${data.rows.length} rows)`);
            queue.push({
                viewport: viewport,
                type: 'snapshot',
                data
            });
        }
    }

    function collectUpdates(){
        let {updates, range} = view.updates;

        // depending on the batch type there will be one of 
        // updates, rows or size. The others will be 
        // undefined and therefore not survive json serialization.
        updates.forEach(batch => {
            const {type, updates, rows, size, offset} = batch;
            queue.push({
                priority: 2,
                viewport: viewport,
                type,
                tablename,
                updates,
                rows,
                size,
                offset,
                range
            }, meta);
        });


        timeoutHandle = setTimeout(collectUpdates, 250);
    }

    timeoutHandle = setTimeout(collectUpdates, 1000);

    return Object.create(null,{

        invoke: {
            value: (method, queue, type, ...params) => {
                const data = view[method](...params);

                if (data){
                    queue.push({
                        priority: 1,
                        viewport,
                        type,
                        data
                    }, meta);
                }
            }
        },

        // A client update request is handled with a synchronous call to view.rows
        update: {value: (options, queue) => {

            const {range, ...dataOptions} = options;
            
            queue.push({
                priority: 1,
                viewport: viewport, 
                type: 'rowset',
                tablename,
                data: {
                    rows: view.rows(range, options),
                    size: view.size,
                    offset: view.offset
                }
            });

        }},

        cancel: {value : () => {

            if (timeoutHandle){
                clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
            view.destroy();
            view = null;
        }}

    });

}