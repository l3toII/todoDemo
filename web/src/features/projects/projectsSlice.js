import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectsAPI } from '../../services/api';

// Project status constants
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch projects' });
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch project' });
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/create',
  async (projectData, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.create(projectData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to create project' });
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to update project' });
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await projectsAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to delete project' });
    }
  }
);

export const completeProject = createAsyncThunk(
  'projects/complete',
  async (id, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.complete(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to complete project' });
    }
  }
);

export const holdProject = createAsyncThunk(
  'projects/hold',
  async (id, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.hold(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to put project on hold' });
    }
  }
);

export const activateProject = createAsyncThunk(
  'projects/activate',
  async (id, { rejectWithValue }) => {
    try {
      const response = await projectsAPI.activate(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to activate project' });
    }
  }
);

const initialState = {
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all projects
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.projects || [];
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch projects';
      })

      // Fetch project by ID
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload.project;
        state.error = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.currentProject = null;
        state.error = action.payload?.error || 'Failed to fetch project';
      })

      // Create project
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        const newProject = action.payload.project;
        if (newProject) {
          state.projects.push(newProject);
        }
        state.error = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to create project';
      })

      // Update project
      .addCase(updateProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProject = action.payload.project;
        if (updatedProject) {
          const index = state.projects.findIndex((p) => p.id === updatedProject.id);
          if (index !== -1) {
            state.projects[index] = updatedProject;
          }
          // Also update currentProject if it's the same
          if (state.currentProject?.id === updatedProject.id) {
            state.currentProject = updatedProject;
          }
        }
        state.error = null;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to update project';
      })

      // Delete project
      .addCase(deleteProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        state.projects = state.projects.filter((p) => p.id !== deletedId);
        if (state.currentProject?.id === deletedId) {
          state.currentProject = null;
        }
        state.error = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to delete project';
      })

      // Complete project
      .addCase(completeProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeProject.fulfilled, (state, action) => {
        state.loading = false;
        const completedProject = action.payload.project;
        if (completedProject) {
          const index = state.projects.findIndex((p) => p.id === completedProject.id);
          if (index !== -1) {
            state.projects[index] = completedProject;
          }
        }
        state.error = null;
      })
      .addCase(completeProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to complete project';
      })

      // Hold project
      .addCase(holdProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(holdProject.fulfilled, (state, action) => {
        state.loading = false;
        const heldProject = action.payload.project;
        if (heldProject) {
          const index = state.projects.findIndex((p) => p.id === heldProject.id);
          if (index !== -1) {
            state.projects[index] = heldProject;
          }
        }
        state.error = null;
      })
      .addCase(holdProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to put project on hold';
      })

      // Activate project
      .addCase(activateProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(activateProject.fulfilled, (state, action) => {
        state.loading = false;
        const activatedProject = action.payload.project;
        if (activatedProject) {
          const index = state.projects.findIndex((p) => p.id === activatedProject.id);
          if (index !== -1) {
            state.projects[index] = activatedProject;
          }
        }
        state.error = null;
      })
      .addCase(activateProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to activate project';
      });
  },
});

export const { clearError, clearCurrentProject } = projectsSlice.actions;

// Selectors
export const selectAllProjects = (state) => state.projects.projects;

export const selectActiveProjects = (state) =>
  state.projects.projects.filter((p) => p.status === PROJECT_STATUS.ACTIVE);

export const selectProjectsNeedingAttention = (state) =>
  state.projects.projects.filter(
    (p) => p.status === PROJECT_STATUS.ACTIVE && p.has_next_action === false
  );

export const selectProjectById = (state, id) =>
  state.projects.projects.find((p) => p.id === id);

export const selectProjectsLoading = (state) => state.projects.loading;

export const selectProjectsError = (state) => state.projects.error;

export const selectCurrentProject = (state) => state.projects.currentProject;

export default projectsSlice.reducer;
