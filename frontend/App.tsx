import React, { useEffect } from 'react';
import { NativeRouter, Route, Routes, useNavigate, useLocation } from 'react-router-native';
import { StatusBar, useColorScheme, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Timer from './src/features/Timer';
import Schedule from './src/features/Schedule';
import Home from './src/features/Home';
import MotorDetails from './src/features/MotorDetails';
import Login from './src/features/Auth/Login';
import Register from './src/features/Auth/Register';
import LinkMotor from './src/features/LinkMotor/LinkMotor';
import Profile from './src/features/Profile/Profile';
import { setUnauthorizedHandler } from './src/services/api';
import SplashScreen from './src/SplashScreen';

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      navigate('/login');
    });
  }, [navigate]);

  return null;
};

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onBackPress = () => {
      if (location.pathname === '/' || location.pathname === '/login') {
        return false;
      }
      navigate(-1);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandler.remove();
  }, [location, navigate]);

  return null;
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = React.useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NativeRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BackButtonHandler />
        <AuthListener />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/motor/:id" element={<MotorDetails />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/link-motor" element={<LinkMotor />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </NativeRouter>
    </SafeAreaProvider>
  );
}

export default App;
