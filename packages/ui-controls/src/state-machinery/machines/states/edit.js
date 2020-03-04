import * as Evt from '../../state-events';
import {navigationEvents, isTextInput, isSelect, isCombo, clickAnyField} from '../machine-utils';
import editTextInput from './textInput/edit-textInput'
import editSelect from './select/edit-select'
import editCombo from './combo/edit-combo'
import editComposite from './composite/edit-composite'

const state = {
    on: {
        // [Evt.TAB.type]: '#next-cell',
        [Evt.CLICK.type]: clickAnyField()
        // [Evt.CLICK.type]: [
        //     { target: 'focus.focusTextInput', actions: ['setField'], cond: (ctx, evt) => isTextInput(evt.field)},
        //     { target: 'focus.focusSelect', actions: ['setField'], cond: (ctx, evt) => isSelect(evt.field)},
        //     { target: 'focus.focusCombo', actions: ['setField'], cond: (ctx, evt) => isCombo(evt.field)}
        // ]
    },
    states: {
        editComposite,
        editTextInput,
        editCombo,
        editSelect,
        editToggle: {
            id: 'edit-toggle',
            on: navigationEvents()
            // TEXT => id SPACE, if key in keyMap
        }
    }

}
export default state;