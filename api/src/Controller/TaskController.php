<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Task;
use App\Entity\User;
use App\Repository\TaskRepository;
use App\Service\TaskService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * @SuppressWarnings(PHPMD.CouplingBetweenObjects)
 */
#[Route('/api/v1')]
class TaskController extends AbstractController
{
    private const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly ValidatorInterface $validator,
        private readonly TaskService $taskService,
    ) {
    }

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

        return $this->saveTaskWithValidation($task, 'Task created successfully', Response::HTTP_CREATED);
    }

    #[Route('/tasks/inbox', name: 'api_tasks_inbox', methods: ['GET'])]
    public function inbox(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $tasks = $this->taskRepository->findInboxByUser($user);

        return $this->taskListResponse($tasks);
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
        $data = json_decode($request->getContent(), true) ?? [];

        $updateError = $this->applyTaskUpdates($task, $data);
        if ($updateError !== null) {
            return $updateError;
        }

        return $this->saveTaskWithValidation($task, 'Task updated successfully');
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

    /**
     * Clarify a task by changing its status according to GTD workflow.
     *
     * Valid target statuses depend on current status (see TaskService).
     * Options:
     *   - target_status: required, the new status
     *   - energy_level: optional (low/medium/high)
     *   - time_estimate: optional (minutes)
     *   - due_date: optional (Y-m-d format)
     *   - notes: optional (additional notes)
     */
    #[Route('/tasks/{id}/clarify', name: 'api_tasks_clarify', methods: ['PATCH'], requirements: ['id' => self::UUID_PATTERN])]
    public function clarify(string $id, Request $request): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $task = $result['task'];
        $data = json_decode($request->getContent(), true) ?? [];

        // Validate required field
        if (!isset($data['target_status']) || !is_string($data['target_status'])) {
            return $this->errorResponse('target_status is required', 'MISSING_TARGET_STATUS', Response::HTTP_BAD_REQUEST);
        }

        $targetStatus = $data['target_status'];

        // Validate target status is a valid status
        if (!in_array($targetStatus, Task::STATUSES, true)) {
            return $this->json([
                'error' => 'Invalid target status',
                'code' => 'INVALID_TARGET_STATUS',
                'allowed_values' => Task::STATUSES,
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check if transition is allowed
        if (!$this->taskService->isValidTransition($task->getStatus(), $targetStatus)) {
            return $this->json([
                'error' => sprintf(
                    'Invalid status transition from "%s" to "%s"',
                    $task->getStatus(),
                    $targetStatus
                ),
                'code' => 'INVALID_TRANSITION',
                'current_status' => $task->getStatus(),
                'target_status' => $targetStatus,
                'allowed_transitions' => $this->taskService->getAllowedTransitions($task->getStatus()),
            ], Response::HTTP_BAD_REQUEST);
        }

        // Build options array
        $options = [];

        if (isset($data['energy_level'])) {
            if (!in_array($data['energy_level'], Task::ENERGY_LEVELS, true)) {
                return $this->json([
                    'error' => 'Invalid energy level',
                    'code' => 'INVALID_ENERGY_LEVEL',
                    'allowed_values' => Task::ENERGY_LEVELS,
                ], Response::HTTP_BAD_REQUEST);
            }
            $options['energy_level'] = $data['energy_level'];
        }

        if (isset($data['time_estimate'])) {
            if (!is_int($data['time_estimate']) || $data['time_estimate'] <= 0) {
                return $this->errorResponse(
                    'time_estimate must be a positive integer (minutes)',
                    'INVALID_TIME_ESTIMATE',
                    Response::HTTP_BAD_REQUEST
                );
            }
            $options['time_estimate'] = $data['time_estimate'];
        }

        if (isset($data['due_date'])) {
            try {
                new \DateTimeImmutable($data['due_date']);
                $options['due_date'] = $data['due_date'];
            } catch (\Exception) {
                return $this->errorResponse(
                    'Invalid due_date format. Use Y-m-d.',
                    'INVALID_DUE_DATE',
                    Response::HTTP_BAD_REQUEST
                );
            }
        }

        if (isset($data['notes']) && is_string($data['notes'])) {
            $options['notes'] = $data['notes'];
        }

        try {
            $clarifiedTask = $this->taskService->clarify($task, $targetStatus, $options);

            return $this->json([
                'message' => 'Task clarified successfully',
                'task' => $clarifiedTask->toArray(),
                'transition' => [
                    'from' => $task->getStatus() === $targetStatus ? $targetStatus : $data['target_status'],
                    'to' => $clarifiedTask->getStatus(),
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 'CLARIFICATION_FAILED', Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Get allowed status transitions for a task.
     */
    #[Route('/tasks/{id}/transitions', name: 'api_tasks_transitions', methods: ['GET'], requirements: ['id' => self::UUID_PATTERN])]
    public function getTransitions(string $id): JsonResponse
    {
        $result = $this->getAuthenticatedUserAndTask($id);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $task = $result['task'];
        $currentStatus = $task->getStatus();

        return $this->json([
            'task_id' => $task->getId()->toRfc4122(),
            'current_status' => $currentStatus,
            'allowed_transitions' => $this->taskService->getAllowedTransitions($currentStatus),
        ]);
    }

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

        return $this->taskListResponse($tasks);
    }

    #[Route('/tasks/stats', name: 'api_tasks_stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $user = $this->getAuthenticatedUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $countsByStatus = $this->taskRepository->countByStatusForUser($user);

        return $this->json([
            'by_status' => $countsByStatus,
            'overdue_count' => count($this->taskRepository->findOverdueByUser($user)),
            'due_today_count' => count($this->taskRepository->findDueTodayByUser($user)),
            'inbox_count' => $countsByStatus[Task::STATUS_INBOX] ?? 0,
            'next_actions_count' => $countsByStatus[Task::STATUS_NEXT_ACTION] ?? 0,
        ]);
    }

    private function getAuthenticatedUser(): User|JsonResponse
    {
        $user = $this->getUser();

        return $user instanceof User
            ? $user
            : $this->errorResponse('Not authenticated', 'NOT_AUTHENTICATED', Response::HTTP_UNAUTHORIZED);
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
        $isOwner = $task && $task->getUser()->getId()->toRfc4122() === $user->getId()->toRfc4122();

        return $isOwner
            ? ['user' => $user, 'task' => $task]
            : $this->errorResponse('Task not found', 'NOT_FOUND', Response::HTTP_NOT_FOUND);
    }

    private function errorResponse(string $message, string $code, int $status): JsonResponse
    {
        return $this->json(['error' => $message, 'code' => $code], $status);
    }

    /**
     * @param Task[] $tasks
     */
    private function taskListResponse(array $tasks): JsonResponse
    {
        $count = count($tasks);

        return $this->json([
            'tasks' => array_map(static fn(Task $task) => $task->toArray(), $tasks),
            'count' => $count,
            'has_overflow' => $count > 100,
        ]);
    }

    private function saveTaskWithValidation(Task $task, string $message, int $status = Response::HTTP_OK): JsonResponse
    {
        $errors = $this->validator->validate($task);

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

        $this->taskRepository->save($task);

        return $this->json([
            'message' => $message,
            'task' => $task->toArray(),
        ], $status);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function applyTaskUpdates(Task $task, array $data): ?JsonResponse
    {
        $fieldUpdaters = [
            'title' => fn($v) => $this->validateAndSetTitle($task, $v),
            'status' => fn($v) => $this->validateAndSetEnum($task, 'setStatus', $v, Task::STATUSES, 'status'),
            'energy_level' => fn($v) => $this->validateAndSetEnum($task, 'setEnergyLevel', $v, Task::ENERGY_LEVELS, 'energy level'),
            'time_estimate' => fn($v) => $this->validateAndSetTimeEstimate($task, $v),
            'due_date' => fn($v) => $this->validateAndSetDateTime($task, 'setDueDate', $v, 'due date'),
            'due_time' => fn($v) => $this->validateAndSetDateTime($task, 'setDueTime', $v, 'due time'),
            'position' => fn($v) => $this->validateAndSetPosition($task, $v),
        ];

        if (array_key_exists('notes', $data)) {
            $task->setNotes($data['notes']);
        }

        foreach ($fieldUpdaters as $field => $updater) {
            if (array_key_exists($field, $data)) {
                $error = $updater($data[$field]);
                if ($error !== null) {
                    return $error;
                }
            }
        }

        return null;
    }

    private function validateAndSetTitle(Task $task, mixed $title): ?JsonResponse
    {
        if (!is_string($title) || trim($title) === '') {
            return $this->errorResponse('Title cannot be empty', 'INVALID_TITLE', Response::HTTP_BAD_REQUEST);
        }
        $task->setTitle(trim($title));

        return null;
    }

    /**
     * @param string[] $allowedValues
     */
    private function validateAndSetEnum(Task $task, string $setter, mixed $value, array $allowedValues, string $fieldName): ?JsonResponse
    {
        if ($value !== null && !in_array($value, $allowedValues, true)) {
            return $this->json([
                'error' => "Invalid $fieldName",
                'code' => 'INVALID_' . strtoupper(str_replace(' ', '_', $fieldName)),
                'allowed_values' => $allowedValues,
            ], Response::HTTP_BAD_REQUEST);
        }
        $task->$setter($value);

        return null;
    }

    private function validateAndSetTimeEstimate(Task $task, mixed $value): ?JsonResponse
    {
        if ($value !== null && (!is_int($value) || $value <= 0)) {
            return $this->errorResponse('Time estimate must be a positive integer', 'INVALID_TIME_ESTIMATE', Response::HTTP_BAD_REQUEST);
        }
        $task->setTimeEstimate($value);

        return null;
    }

    private function validateAndSetDateTime(Task $task, string $setter, mixed $value, string $fieldName): ?JsonResponse
    {
        if ($value === null) {
            $task->$setter(null);

            return null;
        }

        try {
            $task->$setter(new \DateTimeImmutable($value));

            return null;
        } catch (\Exception) {
            return $this->errorResponse("Invalid $fieldName format", 'INVALID_' . strtoupper(str_replace(' ', '_', $fieldName)), Response::HTTP_BAD_REQUEST);
        }
    }

    private function validateAndSetPosition(Task $task, mixed $value): ?JsonResponse
    {
        if (!is_int($value) || $value < 0) {
            return $this->errorResponse('Position must be a non-negative integer', 'INVALID_POSITION', Response::HTTP_BAD_REQUEST);
        }
        $task->setPosition($value);

        return null;
    }
}
