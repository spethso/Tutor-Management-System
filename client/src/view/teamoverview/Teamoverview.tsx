import { Theme } from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { withSnackbar, WithSnackbarProps } from 'notistack';
import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { ITeamDTO } from 'shared/model/Team';
import TeamForm, { TeamFormSubmitCallback } from '../../components/forms/TeamForm';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import TableWithForm from '../../components/TableWithForm';
import TeamTableRow from '../../components/TeamTableRow';
import { useDialog } from '../../hooks/DialogService';
import { getStudent } from '../../hooks/fetching/Student';
import { createTeam, getTeamsOfTutorial, deleteTeam, editTeam } from '../../hooks/fetching/Team';
import { getStudentsOfTutorial } from '../../hooks/fetching/Tutorial';
import { Student } from '../../model/Student';
import { Team } from '../../model/Team';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '100%',
      position: 'relative',
    },
    teamForm: {
      marginTop: theme.spacing(1),
    },
    dialogDeleteButton: {
      color: theme.palette.error.main,
    },
  })
);

interface Params {
  tutorialId: string;
}

type Props = WithSnackbarProps & RouteComponentProps<Params>;

function updateStudentsArray(
  studentsToUpdate: Student[],
  students: Student[],
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>
) {
  const updatedStudents = [...students];

  studentsToUpdate.forEach(student => {
    const ind = updatedStudents.findIndex(s => s.id === student.id);

    if (ind > -1) {
      updatedStudents[ind] = student;
    }
  });

  setStudents(updatedStudents);
}

function Teamoverview({ enqueueSnackbar, match }: Props): JSX.Element {
  const { params } = match;
  const classes = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const dialog = useDialog();

  useEffect(() => {
    setIsLoading(true);

    (async function() {
      const [studentsResponse, teams] = await Promise.all([
        getStudentsOfTutorial(params.tutorialId),
        getTeamsOfTutorial(params.tutorialId),
      ]);

      setStudents(studentsResponse);
      setTeams(teams);
      setIsLoading(false);
    })();
  }, [params.tutorialId]);

  const handleCreateTeam: TeamFormSubmitCallback = async (
    { students: studentsFromForm },
    { setSubmitting, resetForm }
  ) => {
    const teamDTO: ITeamDTO = { students: studentsFromForm };

    try {
      const response = await createTeam(params.tutorialId, teamDTO);

      setTeams([...teams, response]);
      updateStudentsArray(response.students, students, setStudents);
      resetForm();
      enqueueSnackbar('Team wurde erfolgreich erstellt.', { variant: 'success' });
    } catch (reason) {
      console.error(reason);
    } finally {
      setSubmitting(false);
    }
  };

  function handleDeleteTeam(team: Team) {
    dialog.show({
      title: 'Team löschen',
      content: `Soll Team ${team.teamNo} wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden!`,
      actions: [
        {
          label: 'Nicht löschen',
          onClick: () => dialog.hide(),
        },
        {
          label: 'Löschen',
          onClick: () => handleDeleteTeamSubmit(team),
          buttonProps: {
            className: classes.dialogDeleteButton,
          },
        },
      ],
    });
  }

  function handleDeleteTeamSubmit(team: Team) {
    deleteTeam(params.tutorialId, team.id)
      .then(async () => {
        setTeams(teams.filter(u => u.id !== team.id));

        const studentsWithoutDeletedTeam = await Promise.all(
          team.students.map(stud => getStudent(stud.id))
        );

        updateStudentsArray(studentsWithoutDeletedTeam, students, setStudents);
      })
      .finally(() => {
        dialog.hide();
        enqueueSnackbar('Team wurde erfolgreich gelöscht.', { variant: 'success' });
      });
  }

  const handleEditTeamSubmit: (team: Team) => TeamFormSubmitCallback = team => async (
    { students },
    { setSubmitting }
  ) => {
    const teamDTO: ITeamDTO = { students };

    try {
      const response = await editTeam(params.tutorialId, team.id, teamDTO);

      setTeams(
        teams.map(group => {
          if (group.id === team.id) {
            return response;
          }

          return group;
        })
      );

      enqueueSnackbar('Team wurde erfolgreich gespeichert.', { variant: 'success' });
      dialog.hide();
    } catch (reason) {
      console.error(reason);
      enqueueSnackbar('Team konnte nicht gespeichert werden.', { variant: 'error' });
      setSubmitting(false);
    }
  };

  function handleEditTeam(team: Team) {
    dialog.show({
      title: `Team ${team.teamNo} bearbeiten`,
      content: (
        <TeamForm
          team={team}
          students={students.filter(student => !student.team || student.team.id === team.id)}
          onSubmit={handleEditTeamSubmit(team)}
          onCancelClicked={dialog.hide}
        />
      ),
    });
  }

  return (
    <div className={classes.root}>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <TableWithForm
          title='Neues Team erstellen'
          placeholder='Kein Team vorhanden.'
          form={
            <TeamForm
              students={students.filter(student => !student.team)}
              onSubmit={handleCreateTeam}
              className={classes.teamForm}
            />
          }
          items={teams}
          createRowFromItem={team => (
            <TeamTableRow
              team={team}
              onEditTeamClicked={handleEditTeam}
              onDeleteTeamClicked={handleDeleteTeam}
            />
          )}
        />
      )}
    </div>
  );
}

export default withRouter(withSnackbar(Teamoverview));
