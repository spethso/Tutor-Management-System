import React from 'react';
import { Redirect, Route, RouteComponentProps, RouteProps } from 'react-router';
import { useLogin } from '../hooks/LoginService';
import { RoutingPath } from '../routes/Routing.routes';

interface PrivateRouteProps extends RouteProps {
  // Make the component required in a private route!
  component: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
}

function PrivateRoute(props: PrivateRouteProps) {
  const { component: Component, ...other } = props;
  const { isLoggedIn } = useLogin();
  const { LOGIN } = RoutingPath;

  function render(innerProps: RouteComponentProps) {
    if (!isLoggedIn()) {
      return <Redirect to={{ pathname: LOGIN }} from={innerProps.location.pathname} />;
    }

    return <Component {...innerProps} />;
  }

  return <Route {...other} render={render} />;
}

export default PrivateRoute;
