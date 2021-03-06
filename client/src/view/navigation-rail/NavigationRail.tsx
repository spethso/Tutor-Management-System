import {
  Divider,
  Drawer,
  DrawerProps,
  Link,
  List,
  ListSubheader,
  Typography,
} from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import { OpenInNew as ExternalLinkIcon } from 'mdi-material-ui';
import React, { useEffect, useMemo, useState } from 'react';
import { getVersionOfApp } from '../../hooks/fetching/Information';
import { useLogin } from '../../hooks/LoginService';
import RailItem from './components/RailItem';
import TutorialRailItem from './components/TutorialRailItem';
import { filterRoutes } from './NavigationRail.helper';

const DRAWER_WIDTH_OPEN = 280;
const DRAWER_WIDTH_CLOSED = 56;

const useStyles = makeStyles(theme =>
  createStyles({
    drawer: {
      maxWidth: DRAWER_WIDTH_OPEN,
      flexShrink: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    },
    drawerOpen: {
      width: DRAWER_WIDTH_OPEN,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    },
    drawerClose: {
      width: DRAWER_WIDTH_CLOSED,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
    },
    displayNone: {
      display: 'none',
    },
    toolbar: theme.mixins.toolbar,
    list: {
      paddingBottom: theme.spacing(4),
      overflowY: 'auto',
      overflowX: 'hidden',
      ...theme.mixins.scrollbar(4),
    },
    version: {
      position: 'absolute',
      bottom: theme.spacing(1),
      left: theme.spacing(1),
      right: theme.spacing(1),
      textAlign: 'center',
    },
  })
);

function NavigationRail({
  className,
  classes: PaperClasses,
  open,
  onClose,
  PaperProps,
  ...other
}: DrawerProps): JSX.Element {
  const classes = useStyles();
  const { userData } = useLogin();
  const [version, setVersion] = useState<string | undefined>(undefined);

  if (!userData) {
    throw new Error('Drawer without a user should be rendered. This is forbidden.');
  }

  const { withoutTutorialRoutes, tutorialRoutes, managementRoutes } = useMemo(
    () => filterRoutes(userData.roles),
    [userData.roles]
  );

  useEffect(() => {
    getVersionOfApp()
      .then(version => setVersion(version))
      .catch(() => setVersion(undefined));
  }, []);

  return (
    <Drawer
      PaperProps={{ elevation: 2, ...PaperProps }}
      {...other}
      variant='permanent'
      open={open}
      className={clsx(classes.drawer, className, {
        [classes.drawerOpen]: open,
        [classes.drawerClose]: !open,
      })}
      classes={{
        ...PaperClasses,
        paper: clsx(PaperClasses && PaperClasses.paper, {
          [classes.drawerOpen]: open,
          [classes.drawerClose]: !open,
        }),
      }}
    >
      <div className={classes.toolbar} />

      <List className={classes.list}>
        {withoutTutorialRoutes.map(route => (
          <RailItem key={route.path} path={route.path} text={route.title} icon={route.icon} />
        ))}

        <Divider />

        {tutorialRoutes.map(route => (
          <TutorialRailItem key={route.path} route={route} userData={userData} />
        ))}

        {managementRoutes.length > 0 && (
          <>
            <Divider />

            <ListSubheader className={clsx(!open && classes.displayNone)}>Verwaltung</ListSubheader>

            {managementRoutes.map(route => (
              <RailItem key={route.path} path={route.path} text={route.title} icon={route.icon} />
            ))}
          </>
        )}
      </List>

      {version && (
        <Typography className={classes.version} variant='caption'>
          {open && <>Version: </>}

          <Link
            color='inherit'
            href={`https://github.com/Dudrie/Tutor-Management-System/releases/tag/v${version}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            {version}
            <ExternalLinkIcon fontSize='inherit' />
          </Link>
        </Typography>
      )}
    </Drawer>
  );
}

export default NavigationRail;
