
import * as Evt from '../state-machinery/state-events';
import {Empty, EditEmpty, SingleCellEdit, EditReadOnly} from './form-config';

const UP = Evt.UP.type;
const DOWN = Evt.DOWN.type;
const TAB = Evt.TAB.type;
const LEFT = Evt.LEFT.type;
const RIGHT = Evt.RIGHT.type;
const ENTER = Evt.ENTER.type;
const COMMIT = Evt.COMMIT.type;

const DEFAULT_DIRECTION = {type: DOWN};

const isFormNavigationEvent = ({type}) => type === DOWN || type === UP || type === TAB || type === ENTER || type === COMMIT
const isRowNavigationEvent = ({type}) => type === LEFT || type === RIGHT

export default class LeggyModel {

  constructor(config, legCount, debugListener=()=>{}){
    this.config = config;
    this.legCount = legCount;
    this.fields = [];
    this.rows = this.buildRows(config);
    this.previousField = null;

    this._currentField = null;
    this._compositeFieldIdx = -1;
    this._rowIdx = -1;
    this._columnIdx = -1;

    this._debugListener = debugListener;
  } 
  /* currentField */
  get currentField(){ return this._currentField; }
  set currentField(value){
    if (value !== this._currentField){
      this._currentField = value;
      this._debugListener('currentField', value);
    }
  }
  /* compositeFieldIdx */
  get compositeFieldIdx(){ return this._compositeFieldIdx; }
  set compositeFieldIdx(value){
    if (value !== this._compositeFieldIdx){
      this._compositeFieldIdx = value;
      this._debugListener('compositeFieldIdx', value);
    }
  }
  /* rowIdx */
  get rowIdx(){ return this._rowIdx; }
  set rowIdx(value){
    if (value !== this._rowIdx){
      this._rowIdx = value;
      this._debugListener('rowIdx', value);
    }
  }
  /* columnIdx */
  get columnIdx(){ return this._columnIdx; }
  set columnIdx(value){
    const isArray = Array.isArray(value);
    if (value !== this._columnIdx && (!isArray || !value.includes(this._columnIdx))){
      if (isArray){
        // this should probably depend on which direction we navigated from,
        // which cannot be determined here
        this._columnIdx = value[0];
      } else{
        this._columnIdx = value;
      }
      this._debugListener('colIdx', this._columnIdx);
    }
  }

  buildRows(config){

    const {layout: {groups}} = config;
    const results = [];
    let tabIdx = 1;
    let legs = this.legCount;

    groups.forEach((group,idx) => {
      if (idx !== 0){
        results.push({
          label: false, isEmpty: true, fields: [{type:'empty', isEmpty: true}]
        })
      }
      group.fields.forEach(field => {
        const row = {
          idx,
          label: field.label,
          fields: expandField(field, tabIdx, legs) 
        };
        results.push(row);
        tabIdx += row.fields.length;
        row.fields.forEach(field => this.fields[field.tabIdx] = field)
      })
    })
    return results;
  }

  // TODO this is called frequently for same field - memoize
  nextField(evt=DEFAULT_DIRECTION, field=this.currentField, field2=field){
    // console.log(`[leggy-model] nextField (currentField=${field.id}) ${evt.type}`)
    const {rows, legCount} = this;
    const [rowIdx] = findField(field, rows, legCount);

    if (isFormNavigationEvent(evt)){
      const [row, columnIdx] = this.nextRow(rowIdx, evt.type);
      if (row){
        let {fields: nextFields} = row;
        if (nextFields.length === 1){
          return nextFields[0];
        } else {
          const next = nextFields[columnIdx];
          if (next.isEmpty || next.isReadOnly){
            return this.nextField(evt, next, field2);
          } else {
            return next;
          }
        }
      } 
    } else if (isRowNavigationEvent(evt)){
      const {fields} = rows[rowIdx];
      const next = nextFieldInRow(fields, this.columnIdx, evt.type);
      if (next){
        return next;
      }
    }
    // returning null will inactivate the form, only TAB can do that
    return evt.type === TAB ? null : field2;
  }

  nextRow(idx, evtType, colIdx=this.columnIdx){
    const {rows,legCount} = this;
    const nextIdx = evtType === DOWN || evtType === TAB || evtType === ENTER || evtType === COMMIT
      ? idx+1
      : idx-1;
  
    const next = rows[nextIdx];
    
    if (next === undefined){
      // are we in a position to tab move to head of next column ?
      if (evtType === TAB && legCount > 1 && colIdx < this.legCount - 1){
        return this.nextRow(-1, evtType, colIdx+1)
      } else {
        return [null];
      }
  
    } else if (next.isEmpty || next.isReadOnly){
      return this.nextRow(nextIdx, evtType);
    } else {
      return [next, colIdx];
    }    
  }
  

  compositeFieldType(field=this.currentField){
    // console.log(`compositeFieldType ${JSON.stringify(field)} compositeFieldIdx=${this.compositeFieldIdx}`);
    return field.type[this.compositeFieldIdx];
  }

  nextCompositeFieldType(field=this.currentField){
    const {type} = field;
    if (Array.isArray(type)){
      // console.log(`nextCompositeFieldType for field ${JSON.stringify(field)} compositeIdx=${this.compositeFieldIdx} ${type[this.compositeFieldIdx+1]}`)
      return type[this.compositeFieldIdx+1];
    }
    // console.log(`nextCompositeFieldType for field ${JSON.stringify(field)} compositeIdx=${this.compositeFieldIdx} UNDEFINED`)
  }

  resetCompositeFieldType(){
    console.log(`resetCompositeFieldIdx to 0`)
    this.compositeFieldIdx = 0;
  }

  setNextCompositeFieldType(){
    console.log(`setCompositeFieldType to ${this.compositeFieldIdx+1}`)
    this.compositeFieldIdx += 1;
  }

  setNextField(evt=DEFAULT_DIRECTION, field=this.currentField, field2=field){
    return this.setCurrentField(this.nextField(evt, field, field2))
  }

  setCurrentField(field, idx=null){
    const {rows,currentField,legCount} = this;
    if (field !== currentField){
      console.log(`[leggy-model] setCurrentField ${field.id} (${field.type}) idx=${idx}`)
      this.previousField = currentField
      this.currentField = field
      if (idx !== null){
        this.compositeFieldIdx = idx;
      }
    }

    const [rowIdx, colIdx] = findField(field, rows, legCount);
    this.rowIdx = rowIdx;
    this.columnIdx = colIdx;


    return field
  }
}


function expandField(field, tabIdx, legs){
  switch (field.layout){
    
    case SingleCellEdit:
      return [{ ...field, tabIdx}]

    case EditEmpty:
      return [{ ...field, tabIdx}]
        .concat(Array(legs-1).fill(Empty));

    case EditReadOnly:
      return [{ ...field, tabIdx}]
        .concat(Array(legs-1).fill(0).map(() => ({
          ...field,
          isReadonly: true,
          tabIdx: ++tabIdx
        })));

    default:
      return Array(legs).fill(0).map(() => ({
        ...field,
        tabIdx: tabIdx++
      }))
  }
}

function nextFieldInRow(fields, idx, direction=DOWN){
  const nextIdx = direction === RIGHT
    ? idx+1
    : idx-1;

  const next = fields[nextIdx];
  
  if (next === undefined){
    return null;
  } else if (next.isEmpty || next.isReadOnly){
    return nextFieldInRow(fields, nextIdx, direction);
  } else {
    return next;
  }    
}

function findField(field, rows, colCount){
  for (let i=0;i<rows.length;i++){
    const {fields} = rows[i];
    const count = fields.length;
    for (let j=0;j<count;j++){
      if (fields[j] === field){
        if (count === 1 && colCount > 1){
          return [i,Array(colCount).fill(0).map((_,i) => i)]
        } else {
          return [i,j];
        }
      }
    }
  }
}