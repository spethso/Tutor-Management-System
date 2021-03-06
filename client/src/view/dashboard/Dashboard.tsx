import React, { useEffect, useState } from 'react';
import { Role } from 'shared/model/Role';
import { ScheincriteriaSummaryByStudents } from 'shared/model/ScheinCriteria';
import LoadingSpinner from '../../components/loading/LoadingSpinner';
import { getScheinCriteriaSummariesOfAllStudentsOfTutorial } from '../../hooks/fetching/Scheincriteria';
import {
  getScheinCriteriaSummaryOfAllStudentsWithTutorialSlots,
  getTutorial,
} from '../../hooks/fetching/Tutorial';
import { useLogin } from '../../hooks/LoginService';
import { Tutorial } from '../../model/Tutorial';
import { StudentByTutorialSlotSummaryMap } from '../../typings/types';
import AdminStatsCard from './components/AdminStatsCard';
import AllTutorialStatistics from './components/AllTutorialStatistics';
import TutorialStatistics from './components/TutorialStatistics';
import { LoggedInUser } from '../../model/LoggedInUser';

export interface TutorialSummaryInfo {
  tutorial: Tutorial;
  studentInfos: ScheincriteriaSummaryByStudents;
}

function isAdmin(userData: LoggedInUser | undefined): boolean {
  return !!userData && userData.roles.includes(Role.ADMIN);
}

function Dashboard(): JSX.Element {
  const { userData } = useLogin();

  const [isLoading, setIsLoading] = useState(false);
  const [tutorialsWithScheinCriteriaSummaries, setTutorialsWithScheinCriteriaSummaries] = useState<
    TutorialSummaryInfo[]
  >([]);

  const [summaries, setSummaries] = useState<StudentByTutorialSlotSummaryMap>({});

  useEffect(() => {
    setIsLoading(true);

    (async function() {
      if (!userData) {
        return;
      }

      if (isAdmin(userData)) {
        const response = await getScheinCriteriaSummaryOfAllStudentsWithTutorialSlots();

        setSummaries(response);
      }

      const sortedTutorials = userData.tutorials.sort((a, b) => a.slot.localeCompare(b.slot));

      for (const loggedInTutorial of sortedTutorials) {
        const tutorial = await getTutorial(loggedInTutorial.id);
        const studentInfos = await getScheinCriteriaSummariesOfAllStudentsOfTutorial(
          loggedInTutorial.id
        );

        setTutorialsWithScheinCriteriaSummaries(prevState => [
          ...prevState,
          { tutorial, studentInfos },
        ]);
      }

      setIsLoading(false);
    })();
  }, [userData]);

  return (
    <div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {isAdmin(userData) && Object.entries(summaries).length > 0 && (
            <div>
              <AdminStatsCard studentsByTutorialSummary={summaries} />
            </div>
          )}

          <AllTutorialStatistics
            items={tutorialsWithScheinCriteriaSummaries}
            createRowFromItem={item => <TutorialStatistics value={item} />}
            placeholder='Keine Tutorien vorhanden'
          />
        </>
      )}
    </div>
  );
}

export default Dashboard;
