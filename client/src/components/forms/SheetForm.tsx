import React from 'react';
import { Sheet, ExerciseDTO } from 'shared/dist/model/Sheet';
import { FormikSubmitCallback } from '../../types';
import FormikCheckbox from './components/FormikCheckbox';
import FormikExerciseEditor, {
  ExerciseFormExercise,
  mapExerciseToFormExercise,
} from './components/FormikExerciseEditor';
import FormikTextField from './components/FormikTextField';
import FormikBaseForm, { CommonlyUsedFormProps, FormikBaseFormProps } from './FormikBaseForm';
import * as Yup from 'yup';

export type SheetFormSubmitCallback = FormikSubmitCallback<SheetFormState>;

const exerciseValidationSchema: Yup.Lazy = Yup.lazy(() =>
  Yup.object().shape<ExerciseFormExercise>({
    exName: Yup.string().required('Benötigt'),
    bonus: Yup.boolean().required('Benötigt'),
    maxPoints: Yup.string().matches(/^\d(\.\d+)?$/, 'Punkte dürfen nur Zahlen sein'),
    subexercises: Yup.array().of(exerciseValidationSchema),
  })
);

const validationSchema = Yup.object().shape<SheetFormState>({
  sheetNo: Yup.number().required('Benötigt'),
  bonusSheet: Yup.boolean().required('Benötigt'),
  exercises: Yup.array<ExerciseFormExercise>()
    .of(exerciseValidationSchema)
    .required('Mind. 1 Aufgabe benötigt.'),
});

interface SheetFormState {
  sheetNo: number;
  exercises: ExerciseFormExercise[];
  bonusSheet: boolean;
}

interface Props extends Omit<FormikBaseFormProps<SheetFormState>, CommonlyUsedFormProps> {
  sheet?: Sheet;
  onSubmit: SheetFormSubmitCallback;
  sheets?: Sheet[];
}

export function convertFormExercisesToDTOs(exercises: ExerciseFormExercise[]): ExerciseDTO[] {
  return exercises.map(ex => ({
    id: ex.id ? ex.id : undefined,
    exName: ex.exName,
    maxPoints: Number.parseFloat(ex.maxPoints),
    bonus: ex.bonus,
    subexercises: convertFormExercisesToDTOs(ex.subexercises),
  }));
}

export function getInitialSheetFormState(sheet?: Sheet, sheets?: Sheet[]): SheetFormState {
  if (!!sheet) {
    const exercises: ExerciseFormExercise[] = sheet.exercises.map(mapExerciseToFormExercise);

    return { sheetNo: sheet.sheetNo, bonusSheet: sheet.bonusSheet, exercises };
  }

  let lastSheetNo = 0;
  if (sheets) {
    lastSheetNo = sheets.length;
  }

  return {
    sheetNo: lastSheetNo + 1,
    exercises: [],
    bonusSheet: false,
  };
}

function SheetForm({ onSubmit, className, sheet, sheets, ...other }: Props): JSX.Element {
  const initialFormState: SheetFormState = getInitialSheetFormState(sheet, sheets);

  return (
    <FormikBaseForm
      {...other}
      initialValues={initialFormState}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {() => (
        <>
          <FormikTextField
            name='sheetNo'
            label='Blattnummer'
            type='number'
            inputProps={{ min: 0, step: 1 }}
          />

          <FormikCheckbox name='bonusSheet' label='Bonusblatt' />

          <FormikExerciseEditor name='exercises' disableAutofocus={!!sheet} />
        </>
      )}
    </FormikBaseForm>
  );
}

export default SheetForm;
