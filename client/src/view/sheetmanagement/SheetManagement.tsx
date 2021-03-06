import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { withSnackbar, WithSnackbarProps } from 'notistack';
import React, { useEffect, useState } from 'react';
import { ISheetDTO } from 'shared/model/Sheet';
import SheetForm, {
  convertFormExercisesToDTOs,
  getInitialSheetFormState,
  SheetFormSubmitCallback,
} from '../../components/forms/SheetForm';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import TableWithForm from '../../components/TableWithForm';
import { useDialog } from '../../hooks/DialogService';
import { useAxios } from '../../hooks/FetchingService';
import { Sheet } from '../../model/Sheet';
import { getDuplicateExerciseName } from '../points-sheet/util/helper';
import SheetRow from './components/SheetRow';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dialogDeleteButton: {
      color: theme.palette.error.main,
    },
  })
);

function SheetManagement({ enqueueSnackbar }: WithSnackbarProps): JSX.Element {
  const classes = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const {
    getAllSheets,
    createSheet,
    editSheet: editSheetRequest,
    deleteSheet: deleteSheetRequest,
  } = useAxios();
  const dialog = useDialog();

  useEffect(() => {
    setIsLoading(true);
    getAllSheets()
      .then(response => {
        setSheets(response);
        setIsLoading(false);
      })
      .catch(reason => console.error(reason));
  }, [getAllSheets]);

  const handleSubmit: SheetFormSubmitCallback = async (
    { sheetNo, exercises, bonusSheet },
    { setSubmitting, resetForm, setFieldError }
  ) => {
    const isNoInUse = sheets.find(t => t.sheetNo.toString() === sheetNo) !== undefined;
    const duplicateName: string | undefined = getDuplicateExerciseName(exercises);

    if (duplicateName) {
      setFieldError('exercises', `Die Aufgabenbezeichnung ${duplicateName} ist mehrfach vergeben.`);
      return;
    }

    if (isNoInUse) {
      setFieldError('sheetNo', 'Diese Nummer ist bereits vergeben.');
      return;
    }

    const sheetDTO: ISheetDTO = {
      sheetNo: Number.parseInt(sheetNo),
      exercises: convertFormExercisesToDTOs(exercises),
      bonusSheet,
    };

    try {
      const sheet = await createSheet(sheetDTO);

      setSheets([...sheets, sheet]);
      resetForm({ values: getInitialSheetFormState(undefined, [...sheets, sheet]) });
      enqueueSnackbar(`Blatt #${sheetNo.toString().padStart(2, '0')} wurde erfolgreich erstellt.`, {
        variant: 'success',
      });
    } catch (reason) {
      console.error(reason);
      enqueueSnackbar('Blatt konnte nicht erstellt werden.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const editSheet: (sheet: Sheet) => SheetFormSubmitCallback = sheet => async (
    { sheetNo, exercises, bonusSheet },
    { setSubmitting }
  ) => {
    const sheetDTO: ISheetDTO = {
      sheetNo: Number.parseInt(sheetNo),
      exercises: convertFormExercisesToDTOs(exercises),
      bonusSheet,
    };

    try {
      const response = await editSheetRequest(sheet.id, sheetDTO);

      setSheets(
        sheets.map(s => {
          if (s.id === sheet.id) {
            return response;
          }

          return s;
        })
      );

      enqueueSnackbar('Blatt wurde erfolgreich gespeichert.', { variant: 'success' });
      dialog.hide();
    } catch (reason) {
      console.error(reason);
      enqueueSnackbar('Blatt konnt nicht gespeichert werden.', { variant: 'error' });
      setSubmitting(false);
    }
  };

  function handleEditSheet(sheet: Sheet) {
    dialog.show({
      title: 'Blatt bearbeiten',
      content: (
        <SheetForm
          sheet={sheet}
          onSubmit={editSheet(sheet)}
          onCancelClicked={() => dialog.hide()}
        />
      ),
      DialogProps: {
        maxWidth: 'xl',
      },
    });
  }

  function handleDeleteSheet(sheet: Sheet) {
    const sheetNo: string = sheet.sheetNo.toString().padStart(2, '0');
    dialog.show({
      title: 'Blatt löschen',
      content: `Soll das Blatt #${sheetNo} wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.`,
      actions: [
        {
          label: 'Nicht löschen',
          onClick: () => dialog.hide(),
        },
        {
          label: 'Löschen',
          onClick: () => deleteSheet(sheet),
          buttonProps: {
            className: classes.dialogDeleteButton,
          },
        },
      ],
    });
  }

  function deleteSheet(sheet: Sheet) {
    deleteSheetRequest(sheet.id)
      .then(() => {
        setSheets(sheets.filter(s => s.id !== sheet.id));
        enqueueSnackbar('Blatt wurde erfolgreich gelöscht', { variant: 'success' });
      })
      .finally(() => dialog.hide());
  }

  return (
    <div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <TableWithForm
          title='Neues Übungsblatt erstellen'
          form={<SheetForm sheets={sheets} onSubmit={handleSubmit} />}
          items={sheets}
          createRowFromItem={sheet => (
            <SheetRow
              key={sheet.id}
              sheet={sheet}
              onEditSheetClicked={handleEditSheet}
              onDeleteSheetClicked={handleDeleteSheet}
            />
          )}
          placeholder='Keine Übungsblätter vorhanden.'
        />
      )}
    </div>
  );
}

export default withSnackbar(SheetManagement);
