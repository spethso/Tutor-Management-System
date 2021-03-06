import { Button, Typography } from '@material-ui/core';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import clsx from 'clsx';
import { Formik, FormikConfig, FormikHelpers } from 'formik';
import React from 'react';
import FormikDebugDisplay from './components/FormikDebugDisplay';
import SubmitButton from '../loading/SubmitButton';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    form: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridColumnGap: theme.spacing(1),
      gridRowGap: theme.spacing(2),
    },
    buttonRow: {
      gridColumn: '1 / span 2',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      // This prevents a flashing scrollbar if the form spinner is shown.
      marginBottom: theme.spacing(0.5),
    },
    cancelButton: {
      marginRight: theme.spacing(2),
    },
    unsavedChangesMessage: {
      marginRight: theme.spacing(2),
      textAlign: 'right',
    },
  })
);

export type CommonlyUsedFormProps = 'onSubmit' | 'initialValues' | 'validationSchema';

type FormProps = Omit<React.ReactHTML['form'], 'onSubmit' | 'className'>;

export interface FormikBaseFormProps<VALUES> extends FormikConfig<VALUES> {
  onCancelClicked?: (formikBag: FormikHelpers<VALUES>) => void;
  enableDebug?: boolean;
  enableErrorsInDebug?: boolean;
  className?: string;
  formProps?: FormProps;
  disableSubmitButtonIfClean?: boolean;
  enableUnsavedChangesWarning?: boolean;
}

function FormikBaseForm<VALUES>({
  onCancelClicked,
  enableDebug,
  enableErrorsInDebug,
  className,
  children,
  formProps,
  disableSubmitButtonIfClean,
  enableUnsavedChangesWarning,
  ...other
}: FormikBaseFormProps<VALUES>): JSX.Element {
  const classes = useStyles();

  return (
    <Formik {...other}>
      {formik => (
        <form
          {...formProps}
          onSubmit={formik.handleSubmit}
          className={clsx(className, classes.form)}
        >
          {children && typeof children === 'function' ? children({ ...formik }) : children}

          <div className={classes.buttonRow}>
            {enableUnsavedChangesWarning && formik.dirty && (
              <Typography className={classes.unsavedChangesMessage}>
                Es gibt ungespeicherte Änderungen.
              </Typography>
            )}

            {onCancelClicked && (
              <Button
                variant='outlined'
                onClick={() => onCancelClicked(formik)}
                className={classes.cancelButton}
              >
                Abbrechen
              </Button>
            )}

            <SubmitButton
              color='primary'
              variant='outlined'
              isSubmitting={formik.isSubmitting}
              disabled={!!disableSubmitButtonIfClean && !formik.dirty}
            >
              Speichern
            </SubmitButton>
          </div>

          {enableDebug && (
            <FormikDebugDisplay
              values={formik.values}
              errors={enableErrorsInDebug ? formik.errors : undefined}
            />
          )}
        </form>
      )}
    </Formik>
  );
}

export default FormikBaseForm;
