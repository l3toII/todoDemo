<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Project;
use App\Entity\User;
use App\Repository\ProjectRepository;
use App\Repository\TaskRepository;
use App\Service\ProjectService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/v1')]
class ProjectController extends AbstractController
{
    private const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    public function __construct(
        private readonly ProjectRepository $projectRepository,
        private readonly TaskRepository $taskRepository,
        private readonly ProjectService $projectService,
        private readonly ValidatorInterface $validator,
    ) {
    }

    // =========================================================================
    // List Endpoints
    // =========================================================================

    #[Route('/projects', name: 'api_projects_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $status = $request->query->get('status');

        if ($status !== null) {
            $projects = $this->projectRepository->findByStatus($user, $status);
        } else {
            $projects = $this->projectRepository->findAllByUser($user);
        }

        return $this->projectListResponse($projects);
    }

    #[Route('/projects/needing-attention', name: 'api_projects_needing_attention', methods: ['GET'])]
    public function needingAttention(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $projects = $this->projectService->getProjectsNeedingAttention($user);

        return $this->projectListResponse($projects);
    }

    #[Route('/projects/due-for-review', name: 'api_projects_due_for_review', methods: ['GET'])]
    public function dueForReview(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $projects = $this->projectService->getProjectsDueForReview($user);

        return $this->projectListResponse($projects);
    }

    // =========================================================================
    // CRUD Endpoints
    // =========================================================================

    #[Route('/projects/{id}', name: 'api_projects_get', methods: ['GET'], requirements: ['id' => self::UUID_PATTERN])]
    public function get(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndProject($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $project = $result['project'];

        // Get tasks for this project
        $tasks = $this->taskRepository->findByProject($project);

        // Get next action
        $nextAction = $this->projectService->getNextAction($project);

        return $this->json([
            'project' => $this->projectToDetailArray($project, $tasks, $nextAction),
        ]);
    }

    #[Route('/projects', name: 'api_projects_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (!isset($data['title']) || trim($data['title']) === '') {
            return $this->errorResponse('Title is required', 'MISSING_TITLE', Response::HTTP_BAD_REQUEST);
        }

        $title = trim($data['title']);
        $outcome = isset($data['outcome']) ? trim($data['outcome']) : null;

        $project = $this->projectService->create($user, $title, $outcome);

        return $this->json([
            'message' => 'Project created successfully',
            'project' => $this->projectToArray($project),
        ], Response::HTTP_CREATED);
    }

    #[Route('/projects/{id}', name: 'api_projects_update', methods: ['PATCH'], requirements: ['id' => self::UUID_PATTERN])]
    public function update(string $id, Request $request): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndProject($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $project = $result['project'];
        $data = json_decode($request->getContent(), true) ?? [];

        // Update title if provided
        if (isset($data['title'])) {
            $newTitle = trim($data['title']);
            if ($newTitle === '') {
                return $this->errorResponse('Title cannot be empty', 'INVALID_TITLE', Response::HTTP_BAD_REQUEST);
            }
            $project->setTitle($newTitle);
        }

        // Update outcome if provided (FR-019)
        if (array_key_exists('outcome', $data)) {
            $project->setOutcome($data['outcome']);
        }

        // Update position if provided
        if (isset($data['position']) && is_int($data['position'])) {
            $project->setPosition($data['position']);
        }

        // Update review_date if provided
        if (isset($data['review_date'])) {
            try {
                $project->setReviewDate(new \DateTimeImmutable($data['review_date']));
            } catch (\Exception) {
                return $this->errorResponse('Invalid review date format', 'INVALID_DATE', Response::HTTP_BAD_REQUEST);
            }
        }

        return $this->saveProjectWithValidation($project, 'Project updated successfully');
    }

    #[Route('/projects/{id}', name: 'api_projects_delete', methods: ['DELETE'], requirements: ['id' => self::UUID_PATTERN])]
    public function delete(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndProject($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $project = $result['project'];

        // Soft delete by cancelling
        $project->cancel();
        $this->projectRepository->save($project);

        return $this->json(['message' => 'Project deleted successfully']);
    }

    // =========================================================================
    // Status Transition Endpoints
    // =========================================================================

    #[Route('/projects/{id}/complete', name: 'api_projects_complete', methods: ['POST'], requirements: ['id' => self::UUID_PATTERN])]
    public function complete(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndProject($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $project = $result['project'];

        try {
            $this->projectService->complete($project);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 'INVALID_TRANSITION', Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'message' => 'Project completed',
            'project' => $this->projectToArray($project),
        ]);
    }

    #[Route('/projects/{id}/hold', name: 'api_projects_hold', methods: ['POST'], requirements: ['id' => self::UUID_PATTERN])]
    public function hold(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndProject($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $project = $result['project'];

        try {
            $this->projectService->putOnHold($project);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 'INVALID_TRANSITION', Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'message' => 'Project put on hold',
            'project' => $this->projectToArray($project),
        ]);
    }

    #[Route('/projects/{id}/activate', name: 'api_projects_activate', methods: ['POST'], requirements: ['id' => self::UUID_PATTERN])]
    public function activate(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndProject($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $project = $result['project'];

        try {
            $this->projectService->activate($project);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 'INVALID_TRANSITION', Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'message' => 'Project activated',
            'project' => $this->projectToArray($project),
        ]);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function getAuthenticatedUser(): User|JsonResponse
    {
        $user = $this->getUser();

        return $user instanceof User
            ? $user
            : $this->errorResponse('Not authenticated', 'NOT_AUTHENTICATED', Response::HTTP_UNAUTHORIZED);
    }

    /**
     * @return array{user: User, project: Project}|JsonResponse
     */
    private function getAuthenticatedUserAndProject(string $id): array|JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if (!Uuid::isValid($id)) {
            return $this->errorResponse('Invalid project ID', 'INVALID_ID', Response::HTTP_BAD_REQUEST);
        }

        $project = $this->projectRepository->findById(Uuid::fromString($id));

        if ($project === null) {
            return $this->errorResponse('Project not found', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        // Verify ownership
        if ($project->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->errorResponse('Project not found', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        return ['user' => $user, 'project' => $project];
    }

    private function errorResponse(string $message, string $code, int $status): JsonResponse
    {
        return $this->json(['error' => $message, 'code' => $code], $status);
    }

    /**
     * @param Project[] $projects
     */
    private function projectListResponse(array $projects): JsonResponse
    {
        $projectsArray = array_map(fn(Project $project) => $this->projectToArray($project), $projects);

        return $this->json([
            'projects' => $projectsArray,
            'count' => count($projects),
        ]);
    }

    private function projectToArray(Project $project): array
    {
        $baseArray = $project->toArray();

        // Add computed properties
        $baseArray['task_count'] = $this->projectService->countTasks($project);
        $baseArray['next_action_count'] = $this->projectService->countNextActions($project);
        $baseArray['has_next_action'] = $this->projectService->hasNextAction($project);

        return $baseArray;
    }

    /**
     * @param \App\Entity\Task[] $tasks
     */
    private function projectToDetailArray(Project $project, array $tasks, ?\App\Entity\Task $nextAction): array
    {
        $baseArray = $this->projectToArray($project);

        // Add tasks
        $baseArray['tasks'] = array_map(fn($task) => $task->toArray(), $tasks);

        // Add next action
        $baseArray['next_action'] = $nextAction?->toArray();

        return $baseArray;
    }

    private function saveProjectWithValidation(Project $project, string $message, int $status = Response::HTTP_OK): JsonResponse
    {
        $errors = $this->validator->validate($project);

        if (count($errors) > 0) {
            $errorMessages = [];
            foreach ($errors as $error) {
                $errorMessages[$error->getPropertyPath()] = $error->getMessage();
            }

            return $this->json([
                'error' => 'Validation failed',
                'code' => 'VALIDATION_ERROR',
                'details' => $errorMessages,
            ], Response::HTTP_BAD_REQUEST);
        }

        $this->projectRepository->save($project);

        return $this->json([
            'message' => $message,
            'project' => $this->projectToArray($project),
        ], $status);
    }
}
