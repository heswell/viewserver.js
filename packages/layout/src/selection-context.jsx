import React, { useContext, useState } from "react";

const SelectionContext = React.createContext(null);
export default SelectionContext;


// recoil might be a better choice. Otw every layout container will be 
// rendered when selection changes
export const SelectionProvider = ({children, onSelect}) => {
  const [state, setState] = useState(null);

  const handleSelectionChange = selectedValue => {
    if (onSelect){
      onSelect(selectedValue);
    }
    setState(selectedValue);
  }

  return (
    <SelectionContext.Provider value={[state, handleSelectionChange]}>
      {children}
    </SelectionContext.Provider>
  )
}

export const useSelection = (layoutModel) => {
  const context = useContext(SelectionContext);
  if (context && layoutModel){
    const  [selected, setSelected] = context;
    return [
      selected?.$id === layoutModel.$id,
      e => {
        console.log(`set selected ${layoutModel.type} ${layoutModel.$id}`)
        if (selected?.$id === layoutModel.$id){
          setSelected(null);
        } else {
          setSelected(layoutModel);
        }
        e.stopPropagation();
      }
    ]
  } else {
    return [false];
  }
};