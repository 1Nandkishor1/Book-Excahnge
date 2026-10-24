import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authAPI } from "../services/api";
import { errorMessage } from "../utils/errors";

const storedToken = localStorage.getItem("token");
const storedUser = localStorage.getItem("user");

export const login = createAsyncThunk("auth/login", async (credentials, thunkAPI) => {
  try {
    const res = await authAPI.login(credentials);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(errorMessage(err, "Login failed. Try again."));
  }
});

export const register = createAsyncThunk("auth/register", async (payload, thunkAPI) => {
  try {
    const res = await authAPI.register(payload);
    return res.data;
  } catch (err) {
    return thunkAPI.rejectWithValue(errorMessage(err, "Registration failed. Try again."));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: storedToken || null,
    user: storedUser ? JSON.parse(storedUser) : null,
    status: "idle", // idle | loading | failed
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    clearError: (state) => {
      state.error = null;
      state.status = "idle";
    },
    // Keeps the name in the navbar current after a profile edit
    profileUpdated: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.status = "loading";
      state.error = null;
    };
    const handleFulfilled = (state, action) => {
      state.status = "idle";
      state.token = action.payload.token;
      state.user = {
        id: action.payload.userId,
        fullName: action.payload.fullName,
        email: action.payload.email,
      };
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(state.user));
    };
    const handleRejected = (state, action) => {
      state.status = "failed";
      state.error = action.payload;
    };

    builder
      .addCase(login.pending, handlePending)
      .addCase(login.fulfilled, handleFulfilled)
      .addCase(login.rejected, handleRejected)
      .addCase(register.pending, handlePending)
      .addCase(register.fulfilled, handleFulfilled)
      .addCase(register.rejected, handleRejected);
  },
});

export const { logout, clearError, profileUpdated } = authSlice.actions;
export default authSlice.reducer;
