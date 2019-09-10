import React from 'react';
import { useTranslation } from 'react-i18next';
import { FormikSubmitCallback } from '../../types';
import { i18nNamespace } from '../../util/lang/configI18N';
import GeneratedForm from '../generatedForm/GeneratedForm';
import { generateInitialValue } from '../generatedForm/generateInitialValues';
import { FormDataResponse } from '../generatedForm/types/FieldData';
import FormikSelect from './components/FormikSelect';
import FormikTextField from './components/FormikTextField';
import FormikBaseForm, { CommonlyUsedFormProps, FormikBaseFormProps } from './FormikBaseForm';
import * as Yup from 'yup';
import { ScheinCriteriaResponse as ScheinCriteria } from 'shared/dist/model/ScheinCriteria';

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Benötigt'),
  identifier: Yup.string().required('Benötigt'),
});

interface ScheinCriteriaFormState {
  name: string;
  identifier: string;
  [fieldKey: string]: string;
}

export type ScheinCriteriaFormCallback = FormikSubmitCallback<ScheinCriteriaFormState>;

interface Props extends Omit<FormikBaseFormProps<ScheinCriteriaFormState>, CommonlyUsedFormProps> {
  formData: FormDataResponse;
  onSubmit: ScheinCriteriaFormCallback;
  criteria?: ScheinCriteria;
}

function getInitialValues(criteria?: ScheinCriteria): ScheinCriteriaFormState {
  if (!criteria) {
    return {
      name: '',
      identifier: '',
    };
  }

  return { ...criteria };
}

function ScheinCriteriaForm({ onSubmit, formData, criteria, ...other }: Props): JSX.Element {
  const { t } = useTranslation(i18nNamespace.SCHEINCRITERIA);

  const initialValues: ScheinCriteriaFormState = getInitialValues(criteria);

  return (
    <FormikBaseForm
      {...other}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({ handleSubmit, values, isSubmitting, setValues, setFieldValue, ...formik }) => (
        <>
          <FormikTextField name='name' label='Name des Kriteriums' />

          <FormikSelect
            name='identifier'
            emptyPlaceholder='Keine Kriterien vorhanden.'
            label='Art des Kriteriums'
            items={Object.keys(formData)}
            itemToString={key => t(key)}
            itemToValue={key => key}
            disabled={!!criteria}
            onChange={e => {
              const newIdentifier: string = e.target.value as string;

              if (!!newIdentifier) {
                setValues({
                  name: values.name,
                  identifier: values.identifier,
                  ...generateInitialValue(formData[newIdentifier]),
                });
              }

              setFieldValue('identifier', newIdentifier);
            }}
          />

          {!!values.identifier && (
            <GeneratedForm
              key={values.identifier}
              formData={formData[values.identifier]}
              onSubmit={() => {}}
              handleSubmit={handleSubmit}
              values={values}
              isSubmitting={isSubmitting}
              setValues={setValues}
              setFieldValue={setFieldValue}
              {...formik}
            />
          )}
        </>
      )}
    </FormikBaseForm>
  );
}

export default ScheinCriteriaForm;
