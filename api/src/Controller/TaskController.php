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
    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly ValidatorInterface $validator,
    ) {
    }

    // =========================================================================
    // Capture Endpoints (FR-007)
    // =========================================================================

    /**
     * Create a new task (quick capture)
     *
     * POST /api/v1/tasks
     */
    #[Route('/tasks', name: 'api_tasks_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['title']) || trim($data['title']) === '') {
            return $this->json([
                'error' => 'Title is required',
                'code' => 'MISSING_TITLE',
            ], Response::HTTP_BAD_REQUEST);
        }

        $task = new Task();
        $task->setUser($user);
        $task->setTitle(trim($data['title']));

        // Optional fields
        if (isset($data['notes'])) {
            $task->setNotes($data['notes']);
        }

        // Set position to end of inbox
        $maxPosition = $this->taskRepository->getMaxPositionByUserAndStatus($user, Task::STATUS_INBOX);
        $task->setPosition($maxPosition + 1);

        // Validate entity
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
            'message' => 'Task created successfully',
            'task' => $task->toArray(),
        ], Response::HTTP_CREATED);
    }

    // =========================================================================
    // Inbox Endpoints (FR-008)
    // =========================================================================

    /**
     * Get all inbox tasks for the current user
     *
     * GET /api/v1/tasks/inbox
     */
    #[Route('/tasks/inbox', name: 'api_tasks_inbox', methods: ['GET'])]
    public function inbox(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $tasks = $this->taskRepository->findInboxByUser($user);
        $count = count($tasks);

        return $this->json([
            'tasks' => array_map(fn(Task $task) => $task->toArray(), $tasks),
            'count' => $count,
            'has_overflow' => $count > 100,
        ]);
    }

    /**
     * Get inbox count for the current user
     *
     * GET /api/v1/tasks/inbox/count
     */
    #[Route('/tasks/inbox/count', name: 'api_tasks_inbox_count', methods: ['GET'])]
    public function inboxCount(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
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

    /**
     * Get a single task by ID
     *
     * GET /api/v1/tasks/{id}
     */
    #[Route('/tasks/{id}', name: 'api_tasks_get', methods: ['GET'], requirements: ['id' => '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'])]
    public function get(string $id): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($id)) {
            return $this->json([
                'error' => 'Invalid task ID',
                'code' => 'INVALID_ID',
            ], Response::HTTP_BAD_REQUEST);
        }

        $task = $this->taskRepository->findById(Uuid::fromString($id));

        if (!$task) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        // Ensure task belongs to current user
        if ($task->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'task' => $task->toArray(),
        ]);
    }

    /**
     * Update a task
     *
     * PATCH /api/v1/tasks/{id}
     */
    #[Route('/tasks/{id}', name: 'api_tasks_update', methods: ['PATCH'], requirements: ['id' => '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($id)) {
            return $this->json([
                'error' => 'Invalid task ID',
                'code' => 'INVALID_ID',
            ], Response::HTTP_BAD_REQUEST);
        }

        $task = $this->taskRepository->findById(Uuid::fromString($id));

        if (!$task) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        // Ensure task belongs to current user
        if ($task->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        // Update allowed fields
        if (isset($data['title'])) {
            if (trim($data['title']) === '') {
                return $this->json([
                    'error' => 'Title cannot be empty',
                    'code' => 'INVALID_TITLE',
                ], Response::HTTP_BAD_REQUEST);
            }
            $task->setTitle(trim($data['title']));
        }

        if (array_key_exists('notes', $data)) {
            $task->setNotes($data['notes']);
        }

        if (isset($data['status'])) {
            if (!in_array($data['status'], Task::STATUSES, true)) {
                return $this->json([
                    'error' => 'Invalid status',
                    'code' => 'INVALID_STATUS',
                    'allowed_values' => Task::STATUSES,
                ], Response::HTTP_BAD_REQUEST);
            }
            $task->setStatus($data['status']);
        }

        if (array_key_exists('energy_level', $data)) {
            if ($data['energy_level'] !== null && !in_array($data['energy_level'], Task::ENERGY_LEVELS, true)) {
                return $this->json([
                    'error' => 'Invalid energy level',
                    'code' => 'INVALID_ENERGY_LEVEL',
                    'allowed_values' => Task::ENERGY_LEVELS,
                ], Response::HTTP_BAD_REQUEST);
            }
            $task->setEnergyLevel($data['energy_level']);
        }

        if (array_key_exists('time_estimate', $data)) {
            if ($data['time_estimate'] !== null && (!is_int($data['time_estimate']) || $data['time_estimate'] <= 0)) {
                return $this->json([
                    'error' => 'Time estimate must be a positive integer',
                    'code' => 'INVALID_TIME_ESTIMATE',
                ], Response::HTTP_BAD_REQUEST);
            }
            $task->setTimeEstimate($data['time_estimate']);
        }

        if (array_key_exists('due_date', $data)) {
            if ($data['due_date'] !== null) {
                try {
                    $dueDate = new \DateTimeImmutable($data['due_date']);
                    $task->setDueDate($dueDate);
                } catch (\Exception $e) {
                    return $this->json([
                        'error' => 'Invalid due date format',
                        'code' => 'INVALID_DUE_DATE',
                    ], Response::HTTP_BAD_REQUEST);
                }
            } else {
                $task->setDueDate(null);
            }
        }

        if (array_key_exists('due_time', $data)) {
            if ($data['due_time'] !== null) {
                try {
                    $dueTime = new \DateTimeImmutable($data['due_time']);
                    $task->setDueTime($dueTime);
                } catch (\Exception $e) {
                    return $this->json([
                        'error' => 'Invalid due time format',
                        'code' => 'INVALID_DUE_TIME',
                    ], Response::HTTP_BAD_REQUEST);
                }
            } else {
                $task->setDueTime(null);
            }
        }

        if (isset($data['position'])) {
            if (!is_int($data['position']) || $data['position'] < 0) {
                return $this->json([
                    'error' => 'Position must be a non-negative integer',
                    'code' => 'INVALID_POSITION',
                ], Response::HTTP_BAD_REQUEST);
            }
            $task->setPosition($data['position']);
        }

        // Validate entity
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
            'message' => 'Task updated successfully',
            'task' => $task->toArray(),
        ]);
    }

    /**
     * Delete a task (soft delete)
     *
     * DELETE /api/v1/tasks/{id}
     */
    #[Route('/tasks/{id}', name: 'api_tasks_delete', methods: ['DELETE'], requirements: ['id' => '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'])]
    public function delete(string $id): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($id)) {
            return $this->json([
                'error' => 'Invalid task ID',
                'code' => 'INVALID_ID',
            ], Response::HTTP_BAD_REQUEST);
        }

        $task = $this->taskRepository->findById(Uuid::fromString($id));

        if (!$task) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        // Ensure task belongs to current user
        if ($task->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        // Soft delete
        $task->markAsDeleted();
        $this->taskRepository->save($task);

        return $this->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    // =========================================================================
    // Quick Actions
    // =========================================================================

    /**
     * Mark a task as completed
     *
     * POST /api/v1/tasks/{id}/complete
     */
    #[Route('/tasks/{id}/complete', name: 'api_tasks_complete', methods: ['POST'], requirements: ['id' => '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'])]
    public function complete(string $id): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($id)) {
            return $this->json([
                'error' => 'Invalid task ID',
                'code' => 'INVALID_ID',
            ], Response::HTTP_BAD_REQUEST);
        }

        $task = $this->taskRepository->findById(Uuid::fromString($id));

        if (!$task) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        // Ensure task belongs to current user
        if ($task->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        $task->markAsCompleted();
        $this->taskRepository->save($task);

        return $this->json([
            'message' => 'Task completed',
            'task' => $task->toArray(),
        ]);
    }

    /**
     * Restore a deleted task
     *
     * POST /api/v1/tasks/{id}/restore
     */
    #[Route('/tasks/{id}/restore', name: 'api_tasks_restore', methods: ['POST'], requirements: ['id' => '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'])]
    public function restore(string $id): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($id)) {
            return $this->json([
                'error' => 'Invalid task ID',
                'code' => 'INVALID_ID',
            ], Response::HTTP_BAD_REQUEST);
        }

        $task = $this->taskRepository->findById(Uuid::fromString($id));

        if (!$task) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        // Ensure task belongs to current user
        if ($task->getUser()->getId()->toRfc4122() !== $user->getId()->toRfc4122()) {
            return $this->json([
                'error' => 'Task not found',
                'code' => 'NOT_FOUND',
            ], Response::HTTP_NOT_FOUND);
        }

        if (!$task->isDeleted()) {
            return $this->json([
                'error' => 'Task is not deleted',
                'code' => 'NOT_DELETED',
            ], Response::HTTP_BAD_REQUEST);
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

    /**
     * Get all tasks for the current user (with optional filters)
     *
     * GET /api/v1/tasks
     */
    #[Route('/tasks', name: 'api_tasks_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $status = $request->query->get('status');

        if ($status !== null) {
            if (!in_array($status, Task::STATUSES, true)) {
                return $this->json([
                    'error' => 'Invalid status filter',
                    'code' => 'INVALID_STATUS',
                    'allowed_values' => Task::STATUSES,
                ], Response::HTTP_BAD_REQUEST);
            }
            $tasks = $this->taskRepository->findByUserAndStatus($user, $status);
        } else {
            // Return all non-deleted tasks by default
            $tasks = $this->taskRepository->createQueryBuilder('t')
                ->where('t.user = :user')
                ->andWhere('t.status != :deleted')
                ->setParameter('user', $user)
                ->setParameter('deleted', Task::STATUS_DELETED)
                ->orderBy('t.position', 'ASC')
                ->addOrderBy('t.createdAt', 'DESC')
                ->getQuery()
                ->getResult();
        }

        return $this->json([
            'tasks' => array_map(fn(Task $task) => $task->toArray(), $tasks),
            'count' => count($tasks),
        ]);
    }

    /**
     * Get task statistics for the current user
     *
     * GET /api/v1/tasks/stats
     */
    #[Route('/tasks/stats', name: 'api_tasks_stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $user = $this->getUser();

        if (!$user instanceof User) {
            return $this->json([
                'error' => 'Not authenticated',
                'code' => 'NOT_AUTHENTICATED',
            ], Response::HTTP_UNAUTHORIZED);
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
}
