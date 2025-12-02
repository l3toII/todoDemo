<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Task;
use App\Entity\User;
use App\Repository\TaskRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/v1')]
class TaskController extends AbstractController
{
    private const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly ValidatorInterface $validator,
    ) {
    }

    // =========================================================================
    // Capture Endpoints (FR-007)
    // =========================================================================

    #[Route('/tasks', name: 'api_tasks_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['title']) || trim($data['title']) === '') {
            return $this->errorResponse('Title is required', 'MISSING_TITLE', Response::HTTP_BAD_REQUEST);
        }

        $task = new Task();
        $task->setUser($user);
        $task->setTitle(trim($data['title']));

        if (isset($data['notes'])) {
            $task->setNotes($data['notes']);
        }

        $maxPosition = $this->taskRepository->getMaxPositionByUserAndStatus($user, Task::STATUS_INBOX);
        $task->setPosition($maxPosition + 1);

        $validationError = $this->validateAndReturnError($task);
        if ($validationError !== null) {
            return $validationError;
        }

        $this->taskRepository->save($task);

        return $this->json([
            'message' => 'Task created successfully',
            'task' => $task->toArray(),
        ], Response::HTTP_CREATED);
    }

    // =========================================================================
    // Inbox Endpoints (FR-008)
    // =========================================================================

    #[Route('/tasks/inbox', name: 'api_tasks_inbox', methods: ['GET'])]
    public function inbox(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $tasks = $this->taskRepository->findInboxByUser($user);
        $count = count($tasks);

        return $this->json([
            'tasks' => array_map(fn(Task $task) => $task->toArray(), $tasks),
            'count' => $count,
            'has_overflow' => $count > 100,
        ]);
    }

    #[Route('/tasks/inbox/count', name: 'api_tasks_inbox_count', methods: ['GET'])]
    public function inboxCount(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $count = $this->taskRepository->countInboxByUser($user);

        return $this->json([
            'count' => $count,
            'has_overflow' => $count > 100,
        ]);
    }

    // =========================================================================
    // Task CRUD Endpoints
    // =========================================================================

    #[Route('/tasks/{id}', name: 'api_tasks_get', methods: ['GET'], requirements: ['id' => self::UUID_PATTERN])]
    public function get(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        return $this->json(['task' => $result['task']->toArray()]);
    }

    #[Route('/tasks/{id}', name: 'api_tasks_update', methods: ['PATCH'], requirements: ['id' => self::UUID_PATTERN])]
    public function update(string $id, Request $request): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $task = $result['task'];
        $data = json_decode($request->getContent(), true);

        $updateError = $this->applyTaskUpdates($task, $data);
        if ($updateError !== null) {
            return $updateError;
        }

        $validationError = $this->validateAndReturnError($task);
        if ($validationError !== null) {
            return $validationError;
        }

        $this->taskRepository->save($task);

        return $this->json([
            'message' => 'Task updated successfully',
            'task' => $task->toArray(),
        ]);
    }

    #[Route('/tasks/{id}', name: 'api_tasks_delete', methods: ['DELETE'], requirements: ['id' => self::UUID_PATTERN])]
    public function delete(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $result['task']->markAsDeleted();
        $this->taskRepository->save($result['task']);

        return $this->json(['message' => 'Task deleted successfully']);
    }

    // =========================================================================
    // Quick Actions
    // =========================================================================

    #[Route('/tasks/{id}/complete', name: 'api_tasks_complete', methods: ['POST'], requirements: ['id' => self::UUID_PATTERN])]
    public function complete(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $result['task']->markAsCompleted();
        $this->taskRepository->save($result['task']);

        return $this->json([
            'message' => 'Task completed',
            'task' => $result['task']->toArray(),
        ]);
    }

    #[Route('/tasks/{id}/restore', name: 'api_tasks_restore', methods: ['POST'], requirements: ['id' => self::UUID_PATTERN])]
    public function restore(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $task = $result['task'];

        if (!$task->isDeleted()) {
            return $this->errorResponse('Task is not deleted', 'NOT_DELETED', Response::HTTP_BAD_REQUEST);
        }

        $task->restore();
        $this->taskRepository->save($task);

        return $this->json([
            'message' => 'Task restored',
            'task' => $task->toArray(),
        ]);
    }

    // =========================================================================
    // List Endpoints
    // =========================================================================

    #[Route('/tasks', name: 'api_tasks_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $status = $request->query->get('status');

        if ($status !== null && !in_array($status, Task::STATUSES, true)) {
            return $this->json([
                'error' => 'Invalid status filter',
                'code' => 'INVALID_STATUS',
                'allowed_values' => Task::STATUSES,
            ], Response::HTTP_BAD_REQUEST);
        }

        $tasks = $status !== null
            ? $this->taskRepository->findByUserAndStatus($user, $status)
            : $this->taskRepository->findAllActiveByUser($user);

        return $this->json([
            'tasks' => array_map(fn(Task $task) => $task->toArray(), $tasks),
            'count' => count($tasks),
        ]);
    }

    #[Route('/tasks/stats', name: 'api_tasks_stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $countsByStatus = $this->taskRepository->countByStatusForUser($user);
        $overdueTasks = $this->taskRepository->findOverdueByUser($user);
        $dueTodayTasks = $this->taskRepository->findDueTodayByUser($user);

        return $this->json([
            'by_status' => $countsByStatus,
            'overdue_count' => count($overdueTasks),
            'due_today_count' => count($dueTodayTasks),
            'inbox_count' => $countsByStatus[Task::STATUS_INBOX] ?? 0,
            'next_actions_count' => $countsByStatus[Task::STATUS_NEXT_ACTION] ?? 0,
        ]);
    }

    // =========================================================================
    // Private Helper Methods
    // =========================================================================

    private function getAuthenticatedUser(): User|JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->errorResponse('Not authenticated', 'NOT_AUTHENTICATED', Response::HTTP_UNAUTHORIZED);
        }

        return $user;
    }

    /**
     * @return array{user: User, task: Task}|JsonResponse
     */
    private function getAuthenticatedUserAndTask(string $id): array|JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        if (!Uuid::isValid($id)) {
            return $this->errorResponse('Invalid task ID', 'INVALID_ID', Response::HTTP_BAD_REQUEST);
        }

        $task = $this->taskRepository->findById(Uuid::fromString($id));

        if (!$task || $task->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->errorResponse('Task not found', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
        }

        return ['user' => $user, 'task' => $task];
    }

    private function errorResponse(string $message, string $code, int $status): JsonResponse
    {
        return $this->json(['error' => $message, 'code' => $code], $status);
    }

    private function validateAndReturnError(Task $task): ?JsonResponse
    {
        $errors = $this->validator->validate($task);

        if (count($errors) === 0) {
            return null;
        }

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

    private function applyTaskUpdates(Task $task, ?array $data): ?JsonResponse
    {
        if ($data === null) {
            return null;
        }

        if (isset($data['title'])) {
            $error = $this->updateTitle($task, $data['title']);
            if ($error !== null) {
                return $error;
            }
        }

        if (array_key_exists('notes', $data)) {
            $task->setNotes($data['notes']);
        }

        if (isset($data['status'])) {
            $error = $this->updateStatus($task, $data['status']);
            if ($error !== null) {
                return $error;
            }
        }

        if (array_key_exists('energy_level', $data)) {
            $error = $this->updateEnergyLevel($task, $data['energy_level']);
            if ($error !== null) {
                return $error;
            }
        }

        if (array_key_exists('time_estimate', $data)) {
            $error = $this->updateTimeEstimate($task, $data['time_estimate']);
            if ($error !== null) {
                return $error;
            }
        }

        if (array_key_exists('due_date', $data)) {
            $error = $this->updateDueDate($task, $data['due_date']);
            if ($error !== null) {
                return $error;
            }
        }

        if (array_key_exists('due_time', $data)) {
            $error = $this->updateDueTime($task, $data['due_time']);
            if ($error !== null) {
                return $error;
            }
        }

        if (isset($data['position'])) {
            $error = $this->updatePosition($task, $data['position']);
            if ($error !== null) {
                return $error;
            }
        }

        return null;
    }

    private function updateTitle(Task $task, mixed $title): ?JsonResponse
    {
        if (!is_string($title) || trim($title) === '') {
            return $this->errorResponse('Title cannot be empty', 'INVALID_TITLE', Response::HTTP_BAD_REQUEST);
        }
        $task->setTitle(trim($title));
        return null;
    }

    private function updateStatus(Task $task, mixed $status): ?JsonResponse
    {
        if (!in_array($status, Task::STATUSES, true)) {
            return $this->json([
                'error' => 'Invalid status',
                'code' => 'INVALID_STATUS',
                'allowed_values' => Task::STATUSES,
            ], Response::HTTP_BAD_REQUEST);
        }
        $task->setStatus($status);
        return null;
    }

    private function updateEnergyLevel(Task $task, mixed $energyLevel): ?JsonResponse
    {
        if ($energyLevel !== null && !in_array($energyLevel, Task::ENERGY_LEVELS, true)) {
            return $this->json([
                'error' => 'Invalid energy level',
                'code' => 'INVALID_ENERGY_LEVEL',
                'allowed_values' => Task::ENERGY_LEVELS,
            ], Response::HTTP_BAD_REQUEST);
        }
        $task->setEnergyLevel($energyLevel);
        return null;
    }

    private function updateTimeEstimate(Task $task, mixed $timeEstimate): ?JsonResponse
    {
        if ($timeEstimate !== null && (!is_int($timeEstimate) || $timeEstimate <= 0)) {
            return $this->errorResponse(
                'Time estimate must be a positive integer',
                'INVALID_TIME_ESTIMATE',
                Response::HTTP_BAD_REQUEST
            );
        }
        $task->setTimeEstimate($timeEstimate);
        return null;
    }

    private function updateDueDate(Task $task, mixed $dueDate): ?JsonResponse
    {
        if ($dueDate === null) {
            $task->setDueDate(null);
            return null;
        }

        try {
            $task->setDueDate(new \DateTimeImmutable($dueDate));
            return null;
        } catch (\Exception) {
            return $this->errorResponse('Invalid due date format', 'INVALID_DUE_DATE', Response::HTTP_BAD_REQUEST);
        }
    }

    private function updateDueTime(Task $task, mixed $dueTime): ?JsonResponse
    {
        if ($dueTime === null) {
            $task->setDueTime(null);
            return null;
        }

        try {
            $task->setDueTime(new \DateTimeImmutable($dueTime));
            return null;
        } catch (\Exception) {
            return $this->errorResponse('Invalid due time format', 'INVALID_DUE_TIME', Response::HTTP_BAD_REQUEST);
        }
    }

    private function updatePosition(Task $task, mixed $position): ?JsonResponse
    {
        if (!is_int($position) || $position < 0) {
            return $this->errorResponse(
                'Position must be a non-negative integer',
                'INVALID_POSITION',
                Response::HTTP_BAD_REQUEST
            );
        }
        $task->setPosition($position);
        return null;
    }
}
