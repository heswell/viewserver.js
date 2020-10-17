import useEffectSkipFirst from './use-effect-skip-first';

export default function useDataSourceModelBindings(dataSource, gridModel){

  useEffectSkipFirst(() => {
      dataSource.setGroupState(gridModel.groupState);
  }, [dataSource, gridModel.groupState]);

  useEffectSkipFirst(() => {
    dataSource.setSubscribedColumns(gridModel.columnNames);
}, [dataSource, gridModel.columnNames]);

}