// Function to handle login with direct token management
async function testLogin(username, password) {
  console.log("Testing login with:", username, password);
  
  try {
    // Perform login request
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    console.log("Login response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Login failed:", errorText);
      return false;
    }
    
    const data = await response.json();
    console.log("Login response data:", data);
    
    if (data.sessionId) {
      // Save the session ID
      console.log("Setting sessionId to localStorage:", data.sessionId);
      localStorage.setItem('sessionId', data.sessionId);
      
      // Test fetching the user profile with the session ID
      await testFetchUserProfile(data.sessionId);
      
      return true;
    } else {
      console.error("No sessionId in response");
      return false;
    }
  } catch (error) {
    console.error("Login error:", error);
    return false;
  }
}

async function testFetchUserProfile(sessionId) {
  console.log("Testing profile fetch with sessionId:", sessionId);
  
  try {
    const response = await fetch('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    console.log("Profile response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Profile fetch failed:", errorText);
      return null;
    }
    
    const data = await response.json();
    console.log("Profile data:", data);
    return data;
  } catch (error) {
    console.error("Profile fetch error:", error);
    return null;
  }
}

// Add login button to the top of the login page
window.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the login page
  const loginForm = document.querySelector('form');
  if (loginForm) {
    const testButton = document.createElement('button');
    testButton.textContent = "Test Direct Login";
    testButton.style.marginBottom = "20px";
    testButton.style.padding = "10px";
    testButton.style.backgroundColor = "#4f46e5";
    testButton.style.color = "white";
    testButton.style.border = "none";
    testButton.style.borderRadius = "4px";
    
    testButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Get username and password from the form
      const usernameInput = loginForm.querySelector('input[name="username"]');
      const passwordInput = loginForm.querySelector('input[name="password"]');
      
      if (usernameInput && passwordInput) {
        const username = usernameInput.value;
        const password = passwordInput.value;
        
        await testLogin(username, password);
      } else {
        console.error("Could not find username or password inputs");
      }
    });
    
    // Add the button to the page
    loginForm.parentNode.insertBefore(testButton, loginForm);
  }
});