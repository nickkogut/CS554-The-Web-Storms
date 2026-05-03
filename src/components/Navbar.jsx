import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AppBar, Toolbar, Button, Stack } from '@mui/material';

function Navbar() {
  const { currentUser } = useContext(AuthContext);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }
      }
    >
      <Toolbar
        sx={
          {
            minHeight: 64,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap'
          }
        }
      >
        <Button
          component={Link}
          to="/"
          color="inherit"
          sx={{
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: 'none',
            fontSize: 18,
            px: 0
          }}
        >
          QuizQuest
        </Button>

        < Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
          <Button component={Link} to="/join" variant="text" color="inherit" >
            Join Quiz
          </Button>
          < Button component={Link} to="/host" variant="text" color="inherit" >
            Host Quiz
          </Button>

          {
            currentUser ? (
              <>
                <Button component={Link} to="/my-quizzes" variant="outlined" color="inherit" >
                  My Quizzes
                </Button>
                < Button component={Link} to="/create-quiz" variant="outlined" color="inherit" >
                  Create Quiz
                </Button>
                < Button component={Link} to="/logout" variant="contained" color="secondary" >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button component={Link} to="/login" variant="outlined" color="inherit" >
                  Log In
                </Button>
                < Button component={Link} to="/signup" variant="contained" color="secondary" >
                  Sign Up
                </Button>
              </>
            )
          }
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;