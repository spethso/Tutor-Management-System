import {
  createStyles,
  LinearProgress,
  makeStyles,
  TableCell,
  Theme,
  withStyles,
} from '@material-ui/core';
import { lighten } from '@material-ui/core/styles';
import { Account as PersonIcon } from 'mdi-material-ui';
import React, { useEffect, useState } from 'react';
import { ScheinCriteriaSummary } from 'shared/model/ScheinCriteria';
import { useAxios } from '../hooks/FetchingService';
import { Student } from '../model/Student';
import EntityListItemMenu from './list-item-menu/EntityListItemMenu';
import PaperTableRow, { PaperTableRowProps } from './PaperTableRow';

interface Props extends PaperTableRowProps {
  student: Student;
  onEditStudentClicked: (student: Student) => void;
  onDeleteStudentClicked: (student: Student) => void;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    margin: {
      width: '100%',
      margin: theme.spacing(1),
    },
  })
);

const BorderLinearProgress = withStyles({
  root: {
    height: 10,
    backgroundColor: lighten('#ff6c5c', 0.5),
  },
  bar: {
    borderRadius: 20,
    backgroundColor: '#ff6c5c',
  },
})(LinearProgress);

function StudentTableRow({
  student,
  onEditStudentClicked,
  onDeleteStudentClicked,
  ...rest
}: Props): JSX.Element {
  const classes = useStyles();
  const { firstname, lastname, team } = student;
  const { getScheinCriteriaSummaryOfStudent } = useAxios();

  const [CriteriaResult, setCriteriaResult] = useState<ScheinCriteriaSummary | undefined>(
    undefined
  );

  useEffect(() => {
    getScheinCriteriaSummaryOfStudent(student.id).then(response => setCriteriaResult(response));
  }, [getScheinCriteriaSummaryOfStudent, student]);

  return (
    <>
      <PaperTableRow
        label={`${lastname}, ${firstname}`}
        subText={team ? `Team: #${team.teamNo.toString().padStart(2, '0')}` : 'Kein Team'}
        icon={PersonIcon}
        SubTextProps={!team ? { color: 'error' } : undefined}
        buttonCellContent={
          <EntityListItemMenu
            onEditClicked={() => onEditStudentClicked(student)}
            onDeleteClicked={() => onDeleteStudentClicked(student)}
          />
        }
        {...rest}
      >
        <TableCell>
          <div style={{ display: 'flex' }}>
            {CriteriaResult && (
              <BorderLinearProgress
                className={classes.margin}
                variant='determinate'
                color='secondary'
                value={50}
              />
            )}
          </div>
        </TableCell>
      </PaperTableRow>
    </>
  );
}

export default StudentTableRow;
